// server/routes/notifications.js
// Persisted server-originated notifications (SLA, approvals, CSAT prompts).
// Mounted at /api/notifications. Strictly per-user: every query is scoped to
// the session email, so there is nothing to capability-gate.

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const serialize = n => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  ticketId: n.ticket_id,
  ticketKey: n.ticket_key || null,
  read: Boolean(n.read_at),
  createdAt: n.created_at,
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const { rows } = await query(
      `SELECT n.*, t.key AS ticket_key
       FROM notifications n LEFT JOIN tickets t ON t.id = n.ticket_id
       WHERE n.user_email = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [req.user.email, limit]
    );
    const unread = await query(
      'SELECT count(*)::int AS n FROM notifications WHERE user_email=$1 AND read_at IS NULL',
      [req.user.email]
    );
    res.json({ notifications: rows.map(serialize), unread: unread.rows[0].n });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'UPDATE notifications SET read_at = now() WHERE id=$1 AND user_email=$2 AND read_at IS NULL',
      [req.params.id, req.user.email]
    );
    res.json({ ok: true, updated: rowCount });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET read_at = now() WHERE user_email=$1 AND read_at IS NULL',
      [req.user.email]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
