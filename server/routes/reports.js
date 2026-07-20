// server/routes/reports.js
// KPI/reporting aggregates. Mounted at /api/reports, gated on reports.view.
// Dates are computed server-side (UTC day buckets) so every client sees the
// same numbers. Every endpoint accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD and
// defaults to the trailing 30 days.

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireCapability } from '../auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireCapability('reports.view'));

function range(req) {
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : new Date();
  const from = req.query.from
    ? new Date(`${req.query.from}T00:00:00.000Z`)
    : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  return { from, to };
}

// Headline tiles: volumes, open backlog, MTTR, first-response, SLA, CSAT.
router.get('/overview', async (req, res, next) => {
  try {
    const r = range(req);
    if (!r) return res.status(400).json({ error: 'Invalid from/to.' });
    const { rows } = await query(
      `SELECT
         count(*) FILTER (WHERE created_at BETWEEN $1 AND $2)::int                          AS created,
         count(*) FILTER (WHERE resolved_at BETWEEN $1 AND $2)::int                         AS resolved,
         count(*) FILTER (WHERE resolved_at IS NULL)::int                                   AS open_now,
         round(EXTRACT(EPOCH FROM avg(resolved_at - created_at)
               FILTER (WHERE resolved_at BETWEEN $1 AND $2)) / 3600.0, 1)::float            AS mttr_hours,
         round(EXTRACT(EPOCH FROM avg(first_response_at - created_at)
               FILTER (WHERE first_response_at BETWEEN $1 AND $2)) / 3600.0, 1)::float      AS first_response_hours
       FROM tickets WHERE record_type = 'ticket'`,
      [r.from, r.to]
    );
    const sla = await query(
      `SELECT count(*)::int AS measured,
              count(*) FILTER (WHERE NOT resolution_breached AND NOT response_breached)::int AS met
       FROM tickets
       WHERE record_type='ticket' AND resolution_due_at IS NOT NULL
         AND created_at BETWEEN $1 AND $2`,
      [r.from, r.to]
    );
    const csat = await query(
      `SELECT round(avg(rating), 2)::float AS average,
              count(*) FILTER (WHERE responded_at IS NOT NULL)::int AS responses
       FROM csat_responses WHERE created_at BETWEEN $1 AND $2`,
      [r.from, r.to]
    );
    const s = sla.rows[0];
    res.json({
      ...rows[0],
      slaCompliancePct: s.measured ? Math.round((s.met / s.measured) * 1000) / 10 : null,
      slaMeasured: s.measured,
      csatAverage: csat.rows[0].average,
      csatResponses: csat.rows[0].responses,
      from: r.from,
      to: r.to,
    });
  } catch (err) {
    next(err);
  }
});

// Daily created vs resolved series (zero-filled via generate_series).
router.get('/trend', async (req, res, next) => {
  try {
    const r = range(req);
    if (!r) return res.status(400).json({ error: 'Invalid from/to.' });
    // Pre-aggregate per day BEFORE joining onto the day spine — joining the
    // raw table twice cross-multiplies created×resolved rows on shared days.
    const { rows } = await query(
      `WITH days AS (
         SELECT generate_series(date_trunc('day', $1::timestamptz),
                                date_trunc('day', $2::timestamptz),
                                '1 day')::date AS day
       ),
       c AS (
         SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS n
         FROM tickets WHERE record_type='ticket' GROUP BY 1
       ),
       res AS (
         SELECT date_trunc('day', resolved_at)::date AS day, count(*)::int AS n
         FROM tickets WHERE record_type='ticket' AND resolved_at IS NOT NULL GROUP BY 1
       )
       SELECT d.day, COALESCE(c.n, 0) AS created, COALESCE(res.n, 0) AS resolved
       FROM days d
       LEFT JOIN c ON c.day = d.day
       LEFT JOIN res ON res.day = d.day
       ORDER BY d.day`,
      [r.from, r.to]
    );
    res.json({ days: rows.map(x => ({ day: x.day, created: x.created, resolved: x.resolved })) });
  } catch (err) {
    next(err);
  }
});

// SLA compliance % by priority.
router.get('/sla', async (req, res, next) => {
  try {
    const r = range(req);
    if (!r) return res.status(400).json({ error: 'Invalid from/to.' });
    const { rows } = await query(
      `SELECT priority,
              count(*)::int AS measured,
              count(*) FILTER (WHERE NOT resolution_breached AND NOT response_breached)::int AS met
       FROM tickets
       WHERE record_type='ticket' AND resolution_due_at IS NOT NULL
         AND created_at BETWEEN $1 AND $2
       GROUP BY priority`,
      [r.from, r.to]
    );
    const order = ['Critical', 'High', 'Medium', 'Low'];
    rows.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
    res.json({
      priorities: rows.map(x => ({
        priority: x.priority,
        measured: x.measured,
        met: x.met,
        pct: x.measured ? Math.round((x.met / x.measured) * 1000) / 10 : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Ticket volume grouped by category | priority | requestType.
router.get('/volume', async (req, res, next) => {
  try {
    const r = range(req);
    if (!r) return res.status(400).json({ error: 'Invalid from/to.' });
    const by = ['category', 'priority', 'requestType'].includes(req.query.by)
      ? req.query.by
      : 'category';
    const col =
      by === 'priority'
        ? 't.priority'
        : by === 'requestType'
          ? `COALESCE(rt.name, 'No catalog type')`
          : `COALESCE(t.category, 'Uncategorized')`;
    const { rows } = await query(
      `SELECT ${col} AS label, count(*)::int AS n
       FROM tickets t
       LEFT JOIN request_types rt ON rt.id = t.request_type_id
       WHERE t.record_type='ticket' AND t.created_at BETWEEN $1 AND $2
       GROUP BY 1 ORDER BY n DESC LIMIT 12`,
      [r.from, r.to]
    );
    res.json({ by, groups: rows });
  } catch (err) {
    next(err);
  }
});

// CSAT distribution.
router.get('/csat', async (req, res, next) => {
  try {
    const r = range(req);
    if (!r) return res.status(400).json({ error: 'Invalid from/to.' });
    const { rows } = await query(
      `SELECT round(avg(rating), 2)::float AS average,
              count(*) FILTER (WHERE responded_at IS NOT NULL)::int AS responses,
              count(*)::int AS sent
       FROM csat_responses WHERE created_at BETWEEN $1 AND $2`,
      [r.from, r.to]
    );
    const hist = await query(
      `SELECT rating, count(*)::int AS n FROM csat_responses
       WHERE rating IS NOT NULL AND created_at BETWEEN $1 AND $2
       GROUP BY rating ORDER BY rating`,
      [r.from, r.to]
    );
    res.json({ ...rows[0], histogram: Object.fromEntries(hist.rows.map(h => [h.rating, h.n])) });
  } catch (err) {
    next(err);
  }
});

// Change outcomes (success rate).
router.get('/changes', async (req, res, next) => {
  try {
    const r = range(req);
    if (!r) return res.status(400).json({ error: 'Invalid from/to.' });
    const { rows } = await query(
      `SELECT cd.outcome, count(*)::int AS n
       FROM change_details cd JOIN tickets t ON t.id = cd.ticket_id
       WHERE cd.outcome IS NOT NULL AND t.created_at BETWEEN $1 AND $2
       GROUP BY cd.outcome`,
      [r.from, r.to]
    );
    const total = rows.reduce((s, x) => s + x.n, 0);
    const successful = rows.find(x => x.outcome === 'successful')?.n || 0;
    res.json({
      outcomes: Object.fromEntries(rows.map(x => [x.outcome, x.n])),
      total,
      successRatePct: total ? Math.round((successful / total) * 1000) / 10 : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
