// server/routes/tickets.js
// Ticket CRUD + comments + transitions + assignment, Postgres-backed.
// Mounted at /api/tickets, only when DATABASE_URL is set.
//
// Authorization model (enforced server-side; the client is never trusted):
//   • Any authenticated user may submit a ticket (customers are the point).
//   • Listing/reading:
//       - tickets.view_all      → every ticket
//       - tickets.view_assigned → tickets assigned to you (Developer Portal)
//       - otherwise             → only tickets you requested
//   • Status change: tickets.status_change_any, OR tickets.status_change_own
//     when you are the assignee.
//   • Assign: tickets.assign (assign/claim), tickets.reassign_any to move a
//     ticket off someone else.
//   • Comment: tickets.comment. Internal notes require tickets.view_all (staff).
//   • Delete: tickets.delete.

import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { requireAuth, writeAudit } from '../auth.js';

const router = Router();
router.use(requireAuth);

const can = (user, cap) =>
  Array.isArray(user.role?.capabilities) && user.role.capabilities.includes(cap);

// ─── Serializers (snake_case row → client camelCase shape) ────────────────────
const serializeTicket = (r, extra = {}) => ({
  id: r.id,
  key: r.key,
  title: r.title,
  description: r.description,
  category: r.category,
  priority: r.priority,
  status: r.status,
  requester: { name: r.requester_name, email: r.requester_email },
  assignee: r.assignee_name,
  assigneeEmail: r.assignee_email,
  department: r.department,
  shop: r.shop,
  platforms: r.platforms || [],
  labels: r.labels || [],
  dueDate: r.due_date,
  problemCategory: r.problem_category,
  issueType: r.issue_type || 'Task',
  rank: r.rank,
  watchers: r.watchers || [],
  parentId: r.parent_id,
  currentResult: r.current_result,
  expectedResult: r.expected_result,
  jiraKey: r.jira_key,
  jiraSyncState: r.jira_sync_state,
  jiraSyncedAt: r.jira_synced_at,
  created: r.created_at,
  updated: r.updated_at,
  ...extra,
});
const serializeComment = c => ({
  id: c.id,
  author: c.author,
  body: c.body,
  internal: c.internal,
  time: c.created_at,
});
const serializeTimeline = t => ({ id: t.id, action: t.action, actor: t.actor, date: t.created_at });

// Unique-ish human key with a short retry on collision.
async function generateKey() {
  const year = new Date().getFullYear();
  for (let i = 0; i < 6; i++) {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    const key = `TKT-${year}-${n}`;
    const { rows } = await query('SELECT 1 FROM tickets WHERE key=$1', [key]);
    if (!rows.length) return key;
  }
  return `TKT-${year}-${Date.now().toString().slice(-6)}`;
}

// ─── List ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const where = [];
    const params = [];

    // Visibility scope.
    if (can(req.user, 'tickets.view_all')) {
      // no scope filter
    } else if (can(req.user, 'tickets.view_assigned')) {
      params.push(req.user.email);
      where.push(`assignee_email = $${params.length}`);
    } else {
      params.push(req.user.email);
      where.push(`requester_email = $${params.length}`);
    }

    // Optional filters.
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    if (req.query.priority) {
      params.push(req.query.priority);
      where.push(`priority = $${params.length}`);
    }
    if (req.query.assignee) {
      params.push(String(req.query.assignee).toLowerCase());
      where.push(`assignee_email = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      where.push(`(title ILIKE $${params.length} OR key ILIKE $${params.length})`);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await query(
      `SELECT * FROM tickets ${clause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countRes = await query(
      `SELECT count(*)::int AS total FROM tickets ${clause}`,
      params.slice(0, -2)
    );
    res.json({ tickets: rows.map(r => serializeTicket(r)), total: countRes.rows[0].total });
  } catch (err) {
    next(err);
  }
});

// Fetch a ticket row and apply read authorization. Returns null if not allowed.
async function loadVisible(req, id) {
  const { rows } = await query('SELECT * FROM tickets WHERE id=$1', [id]);
  const t = rows[0];
  if (!t) return { notFound: true };
  const allowed =
    can(req.user, 'tickets.view_all') ||
    t.assignee_email === req.user.email ||
    t.requester_email === req.user.email;
  if (!allowed) return { forbidden: true };
  return { ticket: t };
}

// ─── Read one (with comments + timeline) ──────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { ticket, notFound, forbidden } = await loadVisible(req, req.params.id);
    if (notFound) return res.status(404).json({ error: 'Ticket not found.' });
    if (forbidden) return res.status(403).json({ error: 'Insufficient permissions.' });
    const comments = await query(
      'SELECT * FROM ticket_comments WHERE ticket_id=$1 ORDER BY created_at ASC',
      [ticket.id]
    );
    const timeline = await query(
      'SELECT * FROM ticket_timeline WHERE ticket_id=$1 ORDER BY created_at ASC',
      [ticket.id]
    );
    // Internal notes are staff-only.
    const visibleComments = can(req.user, 'tickets.view_all')
      ? comments.rows
      : comments.rows.filter(c => !c.internal);
    res.json(
      serializeTicket(ticket, {
        comments: visibleComments.map(serializeComment),
        timeline: timeline.rows.map(serializeTimeline),
      })
    );
  } catch (err) {
    next(err);
  }
});

// ─── Create (any authenticated user) ──────────────────────────────────────────
const labelsSchema = z.array(z.string().min(1).max(60)).max(20);
const issueTypeSchema = z.enum(['Task', 'Bug', 'Support Request', 'Sub-task']);
// ISO date (YYYY-MM-DD); nullable so PATCH can clear it.
const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const createSchema = z
  .object({
    title: z.string().min(1).max(300),
    description: z.string().max(20000).default(''),
    category: z.string().max(120).optional(),
    priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
    department: z.string().max(120).optional(),
    shop: z.string().max(120).optional(),
    platforms: z.array(z.string().max(60)).max(40).default([]),
    assigneeEmail: z.string().email().optional(),
    assigneeName: z.string().max(120).optional(),
    labels: labelsSchema.default([]),
    dueDate: dueDateSchema.optional(),
    problemCategory: z.string().max(120).optional(),
    issueType: issueTypeSchema.default('Task'),
    parentId: z.string().uuid().optional(),
    currentResult: z.string().max(4000).optional(),
    expectedResult: z.string().max(4000).optional(),
  })
  .strict();

router.post('/', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
    const d = parsed.data;
    // Setting an assignee at creation is the same privilege as assigning later
    // (the /:id/assign route already enforces it).
    if ((d.assigneeEmail || d.assigneeName) && !can(req.user, 'tickets.assign'))
      return res.status(403).json({ error: 'Insufficient permissions to assign tickets.' });
    if (d.parentId) {
      const parent = await query('SELECT 1 FROM tickets WHERE id=$1', [d.parentId]);
      if (!parent.rows.length) return res.status(400).json({ error: 'Parent ticket not found.' });
    }
    const key = await generateKey();
    const ticket = await withTransaction(async client => {
      const { rows } = await client.query(
        `INSERT INTO tickets
           (key, title, description, category, priority, status,
            requester_name, requester_email, assignee_name, assignee_email,
            department, shop, platforms, labels, due_date, problem_category,
            issue_type, parent_id, current_result, expected_result, jira_sync_state)
         VALUES ($1,$2,$3,$4,$5,'To Do',$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,
                 $14,$15,$16,$17,$18,$19,'local-only')
         RETURNING *`,
        [
          key,
          d.title,
          d.description,
          d.category || null,
          d.priority,
          req.user.name,
          req.user.email,
          d.assigneeName || null,
          d.assigneeEmail?.toLowerCase() || null,
          d.department || req.user.department || null,
          d.shop || null,
          JSON.stringify(d.platforms),
          JSON.stringify(d.labels),
          d.dueDate || null,
          d.problemCategory || null,
          d.parentId ? 'Sub-task' : d.issueType,
          d.parentId || null,
          d.currentResult || null,
          d.expectedResult || null,
        ]
      );
      const t = rows[0];
      await client.query(
        'INSERT INTO ticket_timeline (ticket_id, action, actor) VALUES ($1,$2,$3)',
        [t.id, 'Ticket created', req.user.email]
      );
      return t;
    });
    await writeAudit(req.user.email, 'ticket.create', ticket.key);
    res.status(201).json(serializeTicket(ticket));
  } catch (err) {
    next(err);
  }
});

// ─── Update fields / status ───────────────────────────────────────────────────
const patchSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(20000).optional(),
    category: z.string().max(120).optional(),
    priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
    status: z.string().max(60).optional(),
    labels: labelsSchema.optional(),
    dueDate: dueDateSchema.optional(),
    problemCategory: z.string().max(120).nullable().optional(),
    issueType: issueTypeSchema.optional(),
    rank: z.number().finite().optional(),
    parentId: z.string().uuid().nullable().optional(),
    currentResult: z.string().max(4000).nullable().optional(),
    expectedResult: z.string().max(4000).nullable().optional(),
  })
  .strict();

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
    const { ticket, notFound, forbidden } = await loadVisible(req, req.params.id);
    if (notFound) return res.status(404).json({ error: 'Ticket not found.' });
    if (forbidden) return res.status(403).json({ error: 'Insufficient permissions.' });

    const d = parsed.data;
    const isAssignee = ticket.assignee_email === req.user.email;

    // Status changes have their own capability gate.
    if (d.status && d.status !== ticket.status) {
      const allowed =
        can(req.user, 'tickets.status_change_any') ||
        (can(req.user, 'tickets.status_change_own') && isAssignee);
      if (!allowed) return res.status(403).json({ error: 'Cannot change status of this ticket.' });
    }
    // Editing content requires staff-level access (view_all) or being the assignee.
    const editsContent =
      d.title ||
      d.description ||
      d.category ||
      d.priority ||
      d.labels !== undefined ||
      d.dueDate !== undefined ||
      d.problemCategory !== undefined ||
      d.issueType !== undefined ||
      d.rank !== undefined ||
      d.parentId !== undefined ||
      d.currentResult !== undefined ||
      d.expectedResult !== undefined;
    if (editsContent && !can(req.user, 'tickets.view_all') && !isAssignee) {
      return res.status(403).json({ error: 'Insufficient permissions to edit this ticket.' });
    }
    if (d.parentId) {
      if (d.parentId === ticket.id)
        return res.status(400).json({ error: 'A ticket cannot be its own parent.' });
      const parent = await query('SELECT 1 FROM tickets WHERE id=$1', [d.parentId]);
      if (!parent.rows.length) return res.status(400).json({ error: 'Parent ticket not found.' });
    }

    const sets = [];
    const params = [];
    for (const [col, val] of [
      ['title', d.title],
      ['description', d.description],
      ['category', d.category],
      ['priority', d.priority],
      ['status', d.status],
      ['due_date', d.dueDate],
      ['problem_category', d.problemCategory],
      ['issue_type', d.issueType],
      ['rank', d.rank],
      ['parent_id', d.parentId],
      ['current_result', d.currentResult],
      ['expected_result', d.expectedResult],
    ]) {
      if (val !== undefined) {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (d.labels !== undefined) {
      params.push(JSON.stringify(d.labels));
      sets.push(`labels = $${params.length}::jsonb`);
    }
    if (!sets.length) return res.json(serializeTicket(ticket));
    sets.push('updated_at = now()');
    params.push(ticket.id);

    const updated = await withTransaction(async client => {
      const { rows } = await client.query(
        `UPDATE tickets SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`,
        params
      );
      if (d.status && d.status !== ticket.status) {
        await client.query(
          'INSERT INTO ticket_timeline (ticket_id, action, actor) VALUES ($1,$2,$3)',
          [ticket.id, `Status → ${d.status}`, req.user.email]
        );
      }
      return rows[0];
    });
    await writeAudit(req.user.email, 'ticket.update', ticket.key, { status: d.status });
    res.json(serializeTicket(updated));
  } catch (err) {
    next(err);
  }
});

// ─── Assign ───────────────────────────────────────────────────────────────────
router.post('/:id/assign', async (req, res, next) => {
  try {
    const schema = z
      .object({
        assigneeEmail: z.string().email().nullable(),
        assigneeName: z.string().max(120).optional(),
      })
      .strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input.' });
    const { ticket, notFound } = await loadVisible(req, req.params.id);
    if (notFound) return res.status(404).json({ error: 'Ticket not found.' });

    const hadAssignee = Boolean(ticket.assignee_email);
    const movingSomeoneElse = hadAssignee && ticket.assignee_email !== req.user.email;
    const allowed = movingSomeoneElse
      ? can(req.user, 'tickets.reassign_any')
      : can(req.user, 'tickets.assign');
    if (!allowed)
      return res.status(403).json({ error: 'Insufficient permissions to assign this ticket.' });

    const email = parsed.data.assigneeEmail?.toLowerCase() || null;
    const { rows } = await query(
      'UPDATE tickets SET assignee_email=$1, assignee_name=$2, updated_at=now() WHERE id=$3 RETURNING *',
      [email, parsed.data.assigneeName || null, ticket.id]
    );
    await query('INSERT INTO ticket_timeline (ticket_id, action, actor) VALUES ($1,$2,$3)', [
      ticket.id,
      email ? `Assigned to ${email}` : 'Unassigned',
      req.user.email,
    ]);
    await writeAudit(req.user.email, 'ticket.assign', ticket.key, { assigneeEmail: email });
    res.json(serializeTicket(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── Comment ──────────────────────────────────────────────────────────────────
router.post('/:id/comments', async (req, res, next) => {
  try {
    const schema = z
      .object({ body: z.string().min(1).max(20000), internal: z.boolean().default(false) })
      .strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input.' });
    if (!can(req.user, 'tickets.comment'))
      return res.status(403).json({ error: 'Insufficient permissions.' });
    const { ticket, notFound, forbidden } = await loadVisible(req, req.params.id);
    if (notFound) return res.status(404).json({ error: 'Ticket not found.' });
    if (forbidden) return res.status(403).json({ error: 'Insufficient permissions.' });

    // Only staff may post internal notes.
    const internal = parsed.data.internal && can(req.user, 'tickets.view_all');
    const { rows } = await query(
      'INSERT INTO ticket_comments (ticket_id, author, body, internal) VALUES ($1,$2,$3,$4) RETURNING *',
      [ticket.id, req.user.name, parsed.data.body, internal]
    );
    await query('UPDATE tickets SET updated_at=now() WHERE id=$1', [ticket.id]);
    await writeAudit(req.user.email, 'ticket.comment', ticket.key, { internal });
    res.status(201).json(serializeComment(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (!can(req.user, 'tickets.delete'))
      return res.status(403).json({ error: 'Insufficient permissions.' });
    const { rows } = await query('DELETE FROM tickets WHERE id=$1 RETURNING key', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ticket not found.' });
    await writeAudit(req.user.email, 'ticket.delete', rows[0].key);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
