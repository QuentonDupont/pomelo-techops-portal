// server/routes/audit.js
// Read-only access to the append-only audit log. Mounted at /api/audit.

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireCapability } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', requireCapability('audit.view'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { rows } = await query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const total = await query('SELECT count(*)::int AS n FROM audit_log');
    res.json({
      entries: rows.map(r => ({
        id: r.id,
        actor: r.actor,
        action: r.action,
        target: r.target,
        meta: r.meta,
        at: r.created_at,
      })),
      total: total.rows[0].n,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
