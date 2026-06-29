// server/routes/docs.js
// Documentation persistence for Doc Studio + read views. Mounted at /api/docs.
// Response shapes match src/api/docsApi.js so enabling VITE_API_BASE_URL on the
// client switches it from mock to this backend with no other changes.
//
// Reads require auth; 'IT Team Only' docs are visible only to staff (docs.manage).
// Writes require the docs.manage capability.

import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireCapability, writeAudit } from '../auth.js';

const router = Router();
router.use(requireAuth);

const MAX_VERSIONS = 30;
const can = (u, c) => Array.isArray(u.role?.capabilities) && u.role.capabilities.includes(c);
const normalizeTags = t => {
  if (Array.isArray(t))
    return t
      .map(String)
      .map(s => s.trim())
      .filter(Boolean);
  if (typeof t === 'string')
    return t
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  return [];
};

const serialize = (d, versions) => ({
  id: d.id,
  title: d.title,
  content: d.content,
  category: d.category,
  visibility: d.visibility,
  tags: d.tags || [],
  icon: d.icon,
  description: d.description,
  author: d.author,
  status: d.status,
  featured: d.featured,
  version: d.version,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
  ...(versions ? { versions } : {}),
});
const serializeVersion = v => ({
  versionId: v.version_id,
  savedAt: v.saved_at,
  author: v.author,
  title: v.title,
  content: v.content,
});

// ─── List ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (!can(req.user, 'docs.manage')) where.push(`visibility <> 'IT Team Only'`);
    if (req.query.category && req.query.category !== 'All') {
      params.push(req.query.category);
      where.push(`category = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
    const countRes = await query(`SELECT count(*)::int AS total FROM docs ${clause}`, params);
    params.push(limit, (page - 1) * limit);
    const { rows } = await query(
      `SELECT * FROM docs ${clause} ORDER BY updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = countRes.rows[0].total;
    res.json({ docs: rows.map(d => serialize(d)), total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// Categories with counts (visibility-aware).
router.get('/categories', async (req, res, next) => {
  try {
    const clause = can(req.user, 'docs.manage') ? '' : `WHERE visibility <> 'IT Team Only'`;
    const { rows } = await query(
      `SELECT category, count(*)::int AS count FROM docs ${clause} GROUP BY category ORDER BY category`
    );
    res.json({ categories: rows.filter(r => r.category) });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-export', requireCapability('docs.manage'), async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.json({ docs: [] });
    const { rows } = await query('SELECT * FROM docs WHERE id = ANY($1::uuid[])', [ids]);
    res.json({ docs: rows.map(d => serialize(d)) });
  } catch (err) {
    next(err);
  }
});

// File upload (S3 + AI extraction) lands in the Day 5 attachments work.
router.post('/upload', requireCapability('docs.manage'), (_req, res) => {
  res.status(501).json({ error: 'Upload is handled via the S3 presign flow (coming in Day 5).' });
});

// ─── Read one ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM docs WHERE id=$1', [req.params.id]);
    const d = rows[0];
    if (!d) return res.status(404).json({ error: 'Document not found.' });
    if (d.visibility === 'IT Team Only' && !can(req.user, 'docs.manage'))
      return res.status(403).json({ error: 'Insufficient permissions.' });
    res.json(serialize(d));
  } catch (err) {
    next(err);
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────
const writeSchema = z
  .object({
    title: z.string().min(1).max(300),
    content: z.string().max(200000).default(''),
    category: z.string().max(120).optional(),
    visibility: z.enum(['Public', 'IT Team Only']).default('Public'),
    description: z.string().max(2000).optional(),
    icon: z.string().max(16).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    author: z.string().max(120).optional(),
  })
  .strict();

router.post('/', requireCapability('docs.manage'), async (req, res, next) => {
  try {
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO docs (title, content, category, visibility, description, icon, tags, author, status, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'Active',1) RETURNING *`,
      [
        d.title,
        d.content,
        d.category || 'Other',
        d.visibility,
        d.description || null,
        d.icon || '📝',
        JSON.stringify(normalizeTags(d.tags)),
        d.author || req.user.name,
      ]
    );
    await writeAudit(req.user.email, 'doc.create', rows[0].id, { title: d.title });
    res.status(201).json(serialize(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────
router.put('/:id', requireCapability('docs.manage'), async (req, res, next) => {
  try {
    const parsed = writeSchema.partial().safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
    const d = parsed.data;
    const cur = await query('SELECT id FROM docs WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Document not found.' });

    const sets = ['version = version + 1', 'updated_at = now()'];
    const params = [];
    for (const [col, val] of [
      ['title', d.title],
      ['content', d.content],
      ['category', d.category],
      ['visibility', d.visibility],
      ['description', d.description],
      ['icon', d.icon],
      ['author', d.author],
    ]) {
      if (val !== undefined) {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (d.tags !== undefined) {
      params.push(JSON.stringify(normalizeTags(d.tags)));
      sets.push(`tags = $${params.length}::jsonb`);
    }
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE docs SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    await writeAudit(req.user.email, 'doc.update', req.params.id);
    res.json(serialize(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── Soft delete (archive) ────────────────────────────────────────────────────
router.delete('/:id', requireCapability('docs.manage'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE docs SET status='Archived', updated_at=now() WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document not found.' });
    await writeAudit(req.user.email, 'doc.archive', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Versions ─────────────────────────────────────────────────────────────────
router.post('/:id/versions', requireCapability('docs.manage'), async (req, res, next) => {
  try {
    const cur = await query('SELECT * FROM docs WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Document not found.' });
    const d = cur.rows[0];
    const versionId = 'v-' + Date.now();
    const author = req.body?.author || d.author || req.user.name;
    await withTransaction(async client => {
      await client.query(
        `INSERT INTO doc_versions (doc_id, version_id, title, content, author) VALUES ($1,$2,$3,$4,$5)`,
        [d.id, versionId, d.title, d.content, author]
      );
      // Trim to the most recent MAX_VERSIONS snapshots.
      await client.query(
        `DELETE FROM doc_versions WHERE doc_id=$1 AND id NOT IN (
           SELECT id FROM doc_versions WHERE doc_id=$1 ORDER BY saved_at DESC LIMIT $2)`,
        [d.id, MAX_VERSIONS]
      );
    });
    res
      .status(201)
      .json({
        versionId,
        savedAt: new Date().toISOString(),
        author,
        title: d.title,
        content: d.content,
      });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/versions', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM doc_versions WHERE doc_id=$1 ORDER BY saved_at DESC',
      [req.params.id]
    );
    res.json(rows.map(serializeVersion)); // array (matches mock shape)
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/versions/:versionId/restore',
  requireCapability('docs.manage'),
  async (req, res, next) => {
    try {
      const docRes = await query('SELECT * FROM docs WHERE id=$1', [req.params.id]);
      if (!docRes.rows.length) return res.status(404).json({ error: 'Document not found.' });
      const snapRes = await query('SELECT * FROM doc_versions WHERE doc_id=$1 AND version_id=$2', [
        req.params.id,
        req.params.versionId,
      ]);
      if (!snapRes.rows.length) return res.status(404).json({ error: 'Version not found.' });
      const d = docRes.rows[0];
      const snap = snapRes.rows[0];
      const author = req.body?.author || req.user.name;
      const updated = await withTransaction(async client => {
        // Snapshot current state first so the restore itself is reversible.
        await client.query(
          `INSERT INTO doc_versions (doc_id, version_id, title, content, author) VALUES ($1,$2,$3,$4,$5)`,
          [d.id, 'v-' + Date.now(), d.title, d.content, author]
        );
        const { rows } = await client.query(
          `UPDATE docs SET title=$1, content=$2, version=version+1, updated_at=now() WHERE id=$3 RETURNING *`,
          [snap.title, snap.content, d.id]
        );
        return rows[0];
      });
      await writeAudit(req.user.email, 'doc.restore', d.id, { versionId: req.params.versionId });
      res.json(serialize(updated));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
