// server/routes/jira.js
// Jira / JSM proxy routes, mounted at /api/v1. Pure move from server/index.js
// (Phase 5 split) — credentials stay server-side; every route degrades
// gracefully when JIRA_API_TOKEN is unset.

import { Router } from 'express';
import { z } from 'zod';
import { log } from '../lib/log.js';
import {
  jiraBaseUrl,
  jiraAuthHeaders,
  requireJira,
  sanitizeIssueKey,
  sanitizeProject,
  FALLBACK_JIRA_STATUSES,
} from '../lib/jira.js';

const router = Router();

const submitTicketSchema = z
  .object({
    fields: z.object({}).passthrough(),
    update: z.object({}).passthrough().optional(),
  })
  .strict();

// ─── GET /api/v1/jira/statuses?project=PESD1 ──────────────────────────────────
// Returns the workflow statuses for the project so the UI can use the live
// status names. Falls back to instance-wide statuses, then to a canonical
// Jira Service Management list if the project isn't reachable.
router.get('/jira/statuses', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const project = sanitizeProject(req.query.project);

  const respondFallback = (source, message) =>
    res.json({
      project,
      statuses: FALLBACK_JIRA_STATUSES,
      source,
      ...(message && { note: message }),
    });

  if (!token) return respondFallback('fallback', 'Jira not configured on the server.');
  if (!project) return res.status(400).json({ error: 'Invalid project key.' });

  // 1) Try the project-specific endpoint
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/project/${project}/statuses`, {
      headers: jiraAuthHeaders(token),
    });
    if (upstream.ok) {
      const data = await upstream.json();
      const names = new Set();
      const items = [];
      for (const issueType of Array.isArray(data) ? data : []) {
        for (const s of issueType.statuses || []) {
          if (!names.has(s.name)) {
            names.add(s.name);
            items.push({ name: s.name, id: s.id, category: s.statusCategory?.key || 'undefined' });
          }
        }
      }
      if (items.length > 0) return res.json({ project, statuses: items, source: 'project' });
    } else {
      log('warn', 'Jira project statuses unreachable', { status: upstream.status });
    }
  } catch (err) {
    log('warn', 'Jira project statuses fetch failed', { error: err.message });
  }

  // 2) Try the instance-wide /status endpoint
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/status`, {
      headers: jiraAuthHeaders(token),
    });
    if (upstream.ok) {
      const data = await upstream.json();
      const items = (Array.isArray(data) ? data : []).map(s => ({
        name: s.name,
        id: s.id,
        category: s.statusCategory?.key || 'undefined',
      }));
      if (items.length > 0) return res.json({ project, statuses: items, source: 'instance' });
    }
  } catch {
    /* fall through to fallback */
  }

  // 3) Last resort — canonical Jira Service Management workflow
  return respondFallback(
    'fallback',
    `Project "${project}" is not reachable; using canonical workflow.`
  );
});

// ─── GET /api/v1/jira/issue/:key ──────────────────────────────────────────────
router.get('/jira/issue/:key', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid issue key.' });

  try {
    const upstream = await fetch(
      `${jiraBaseUrl()}/rest/api/3/issue/${key}?fields=summary,status,priority,assignee,updated,created,issuelinks,attachment,labels,components,issuetype,fixVersions,watches`,
      { headers: jiraAuthHeaders(token) }
    );
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Failed to fetch Jira issue.' });
    }
    const data = await upstream.json();
    const links = (data.fields?.issuelinks || [])
      .map(l => {
        const peer = l.outwardIssue || l.inwardIssue;
        if (!peer) return null;
        return {
          type: l.type?.name || 'related',
          direction: l.outwardIssue ? 'outward' : 'inward',
          label: l.outwardIssue ? l.type?.outward : l.type?.inward,
          key: peer.key,
          summary: peer.fields?.summary || '',
          status: peer.fields?.status?.name || '',
        };
      })
      .filter(Boolean);
    const attachments = (data.fields?.attachment || []).map(a => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
      content: a.content,
      author: a.author?.displayName || '',
      created: a.created,
    }));
    return res.json({
      key: data.key,
      summary: data.fields?.summary,
      status: data.fields?.status?.name,
      statusCategory: data.fields?.status?.statusCategory?.key,
      priority: data.fields?.priority?.name,
      assignee: data.fields?.assignee?.displayName || null,
      updated: data.fields?.updated,
      created: data.fields?.created,
      links,
      attachments,
      labels: Array.isArray(data.fields?.labels) ? data.fields.labels : [],
      components: (data.fields?.components || []).map(c => ({ id: c.id, name: c.name })),
      issueType: data.fields?.issuetype?.name || null,
      fixVersions: (data.fields?.fixVersions || []).map(v => v.name),
      watcherCount: data.fields?.watches?.watchCount || 0,
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/v1/jira/comment ────────────────────────────────────────────────
// Body: { key, body } — posts a comment on the issue. The Atlassian REST API
// requires ADF; we wrap the plain text body in a minimal ADF document.
const commentSchema = z
  .object({
    key: z.string().min(1).max(40),
    body: z.string().min(1).max(8000),
    author: z.string().max(200).optional(),
  })
  .strict();

router.post('/jira/comment', async (req, res, next) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid comment payload.' });
  const token = requireJira(res);
  if (!token) return;
  const { key, body, author } = parsed.data;
  const sanitizedKey = sanitizeIssueKey(key);
  if (!sanitizedKey) return res.status(400).json({ error: 'Invalid issue key.' });

  // Prefix the body with the actor's name so threading is preserved on Jira side
  const text = author ? `[Posted via TechOps Portal by ${author}]\n${body}` : body;
  const adf = {
    body: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  };

  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${sanitizedKey}/comment`, {
      method: 'POST',
      headers: jiraAuthHeaders(token),
      body: JSON.stringify(adf),
    });
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      log('error', 'Jira comment error', { status: upstream.status, err });
      return res.status(upstream.status).json({ error: 'Jira refused the comment.' });
    }
    const data = await upstream.json();
    return res.json({ key: sanitizedKey, commentId: data.id, created: data.created });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/issue/:key/comments ─────────────────────────────────────
// Returns all comments on the issue, sorted oldest-first. The portal pulls
// these to merge into the local message thread.
router.get('/jira/issue/:key/comments', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid issue key.' });

  try {
    const upstream = await fetch(
      `${jiraBaseUrl()}/rest/api/3/issue/${key}/comment?orderBy=created`,
      { headers: jiraAuthHeaders(token) }
    );
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Failed to fetch comments.' });
    }
    const data = await upstream.json();
    // Flatten ADF body to plain text for the local UI
    const flatten = node => {
      if (!node) return '';
      if (node.type === 'text') return node.text || '';
      if (Array.isArray(node.content)) return node.content.map(flatten).join('');
      return '';
    };
    const comments = (data.comments || []).map(c => ({
      id: c.id,
      author: c.author?.displayName || 'Unknown',
      created: c.created,
      body: flatten(c.body),
    }));
    return res.json({ key, count: comments.length, comments });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/v1/jira/transition ─────────────────────────────────────────────
// Body: { key, statusName } — finds the transition for the requested target
// status and posts it. Returns the resulting Jira status.
const transitionSchema = z
  .object({ key: z.string().min(1).max(40), statusName: z.string().min(1).max(80) })
  .strict();

router.post('/jira/transition', async (req, res, next) => {
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid transition payload.' });
  const token = requireJira(res);
  if (!token) return;
  const { key, statusName } = parsed.data;
  const sanitizedKey = sanitizeIssueKey(key);
  if (!sanitizedKey) return res.status(400).json({ error: 'Invalid issue key.' });

  try {
    // 1. List available transitions for this issue
    const txList = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${sanitizedKey}/transitions`, {
      headers: jiraAuthHeaders(token),
    });
    if (!txList.ok) {
      return res.status(txList.status).json({ error: 'Failed to fetch transitions.' });
    }
    const txData = await txList.json();
    const target = (txData.transitions || []).find(
      t => t.to?.name?.toLowerCase() === statusName.toLowerCase()
    );
    if (!target) {
      return res.status(409).json({
        error: `No transition available to "${statusName}".`,
        available: (txData.transitions || []).map(t => t.to?.name),
      });
    }

    // 2. POST the transition
    const post = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${sanitizedKey}/transitions`, {
      method: 'POST',
      headers: jiraAuthHeaders(token),
      body: JSON.stringify({ transition: { id: target.id } }),
    });
    if (!post.ok) {
      const err = await post.json().catch(() => ({}));
      log('error', 'Jira transition error', { status: post.status, err });
      return res.status(post.status).json({ error: 'Jira refused the transition.' });
    }
    return res.json({ key: sanitizedKey, status: target.to?.name });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/poll?project=PESD1&since=ISO ────────────────────────────
// Returns issues in `project` whose updated timestamp is >= since. Used for
// background polling so the portal can pick up Jira-side changes.
router.get('/jira/poll', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const project = sanitizeProject(req.query.project);
  const since = String(req.query.since || '');
  if (!project) return res.status(400).json({ error: 'Invalid project key.' });

  // Build JQL. If since is a valid ISO date, use a relative minute window.
  let jql = `project = ${project} ORDER BY updated DESC`;
  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      const mins = Math.max(1, Math.ceil((Date.now() - sinceDate.getTime()) / 60000));
      jql = `project = ${project} AND updated >= -${mins}m ORDER BY updated DESC`;
    }
  }

  // Atlassian retired /rest/api/3/search in 2024 — use the new /search/jql endpoint.
  // Falls back to an empty result so polling stays harmless when Jira is unreachable.
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: jiraAuthHeaders(token),
      body: JSON.stringify({
        jql,
        fields: ['summary', 'status', 'priority', 'assignee', 'updated', 'created'],
        maxResults: 50,
      }),
    });
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      log('warn', 'Jira poll unavailable', { status: upstream.status, err });
      return res.json({
        project,
        since,
        count: 0,
        issues: [],
        fetchedAt: new Date().toISOString(),
        unavailable: true,
      });
    }
    const data = await upstream.json();
    const issues = (data.issues || []).map(i => ({
      key: i.key,
      summary: i.fields?.summary,
      status: i.fields?.status?.name,
      statusCategory: i.fields?.status?.statusCategory?.key,
      priority: i.fields?.priority?.name,
      assignee: i.fields?.assignee?.displayName || null,
      updated: i.fields?.updated,
      created: i.fields?.created,
    }));
    return res.json({
      project,
      since,
      count: issues.length,
      issues,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/issue/:key/sla (S) ──────────────────────────────────────
// Returns JSM SLA cycles for the issue. Falls back to {available:false} when
// the project doesn't use Service Desk SLAs.
router.get('/jira/issue/:key/sla', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid issue key.' });

  try {
    // JSM SLA lives on the issue fields, retrievable via expand=names + fields=*all
    const upstream = await fetch(
      `${jiraBaseUrl()}/rest/api/3/issue/${key}?fields=*all&expand=names`,
      { headers: jiraAuthHeaders(token) }
    );
    if (!upstream.ok) return res.json({ available: false, key, note: 'Issue not reachable' });
    const data = await upstream.json();
    // SLA fields are customfield_XXXXX with ongoingCycle + completedCycles
    const slaFields = Object.entries(data.fields || {}).filter(
      ([, v]) => v && typeof v === 'object' && ('ongoingCycle' in v || 'completedCycles' in v)
    );
    if (slaFields.length === 0)
      return res.json({ available: false, key, note: 'No SLA cycles on issue' });
    const cycles = slaFields.map(([k, v]) => {
      const ongoing = v.ongoingCycle;
      const friendlyName = (data.names || {})[k] || k;
      return {
        name: friendlyName,
        breached: ongoing?.breached ?? false,
        paused: ongoing?.paused ?? false,
        withinBreachTime: ongoing?.withinBreachTime ?? null,
        elapsedTime: ongoing?.elapsedTime?.friendly || null,
        remainingTime: ongoing?.remainingTime?.friendly || null,
        breachTime: ongoing?.breachTime?.iso8601 || null,
        completedCount: Array.isArray(v.completedCycles) ? v.completedCycles.length : 0,
      };
    });
    res.json({ available: true, key, cycles, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/issue/:key/pull-requests (PR) ───────────────────────────
// Returns the GitHub pull requests linked to the issue, sourced from Jira's
// dev-status API. The dev-status endpoint is keyed by the numeric issue id, so
// we resolve that first. Normalises into the flat shape the portal renders.
// Note: Jira's pullrequest dev-status payload does not carry CI/check rollups
// (those live in the separate build dataType and aren't PR-keyed), so `checks`
// is returned as null from live Jira — the client keeps any richer mock data.
router.get('/jira/issue/:key/pull-requests', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid issue key.' });

  try {
    // 1) Resolve the numeric issue id (dev-status is keyed by id, not key).
    const issueRes = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${key}?fields=id`, {
      headers: jiraAuthHeaders(token),
    });
    if (!issueRes.ok) return res.json({ available: false, key, note: 'Issue not reachable' });
    const issue = await issueRes.json();
    const issueId = issue.id;
    if (!issueId) return res.json({ available: false, key, note: 'No issue id' });

    // 2) Pull the GitHub PR detail from dev-status.
    const devRes = await fetch(
      `${jiraBaseUrl()}/rest/dev-status/latest/issue/detail?issueId=${encodeURIComponent(issueId)}&applicationType=GitHub&dataType=pullrequest`,
      { headers: jiraAuthHeaders(token) }
    );
    if (!devRes.ok) return res.json({ available: false, key, note: 'Dev-status unavailable' });
    const dev = await devRes.json();

    const raw = (dev.detail || []).flatMap(d => d.pullRequests || []);
    const pullRequests = raw.map(pr => {
      const number = parseInt(String(pr.id || '').replace(/[^0-9]/g, ''), 10) || null;
      return {
        id: pr.id || `pr-${number}`,
        number,
        title: pr.name || `PR #${number}`,
        url: pr.url || null,
        repo:
          pr.repositoryName ||
          (pr.repositoryUrl || '').replace(/^https?:\/\/github\.com\//, '') ||
          null,
        status: String(pr.status || 'OPEN').toUpperCase(),
        author: { name: pr.author?.name || null, login: pr.author?.name || null },
        sourceBranch: pr.source?.branch || null,
        targetBranch: pr.destination?.branch || null,
        additions: null,
        deletions: null,
        changedFiles: null,
        commentCount: pr.commentCount ?? 0,
        reviews: (pr.reviewers || []).map(r => ({
          reviewer: r.name,
          state: r.approved ? 'APPROVED' : 'COMMENTED',
        })),
        checks: null,
        lastUpdate: pr.lastUpdate || null,
      };
    });

    res.json({
      available: true,
      key,
      pullRequests,
      source: 'jira',
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/users/assignable (U) ────────────────────────────────────
router.get('/jira/users/assignable', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const project = sanitizeProject(req.query.project);
  if (!token) return res.json({ users: [], source: 'fallback', project });

  try {
    const upstream = await fetch(
      `${jiraBaseUrl()}/rest/api/3/user/assignable/search?project=${project}&maxResults=100`,
      { headers: jiraAuthHeaders(token) }
    );
    if (!upstream.ok) return res.json({ users: [], source: 'fallback', project });
    const data = await upstream.json();
    const users = (Array.isArray(data) ? data : [])
      .map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        emailAddress: u.emailAddress || null,
        avatarUrl: u.avatarUrls?.['24x24'] || null,
        active: u.active !== false,
      }))
      .filter(u => u.active);
    res.json({ users, source: 'jira', project });
  } catch {
    res.json({ users: [], source: 'fallback', project });
  }
});

// ─── POST /api/v1/jira/issue/:key/attachments (A) ─────────────────────────────
// Accepts JSON { files: [{ filename, contentType, dataBase64 }] } so the
// frontend doesn't need a multipart encoder. Forwards as multipart/form-data
// to Jira's attachment endpoint.
const attachmentsSchema = z
  .object({
    files: z
      .array(
        z
          .object({
            filename: z.string().min(1).max(300),
            contentType: z.string().min(1).max(200),
            dataBase64: z.string().min(1).max(20_000_000),
          })
          .strict()
      )
      .min(1)
      .max(10),
  })
  .strict();

router.post('/jira/issue/:key/attachments', async (req, res, next) => {
  const parsed = attachmentsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid attachments payload.' });
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid issue key.' });

  try {
    const fd = new FormData();
    for (const f of parsed.data.files) {
      const buf = Buffer.from(f.dataBase64, 'base64');
      fd.append('file', new Blob([buf], { type: f.contentType }), f.filename);
    }
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${key}/attachments`, {
      method: 'POST',
      headers: {
        // Jira requires X-Atlassian-Token to bypass XSRF on attachments
        'X-Atlassian-Token': 'no-check',
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
      },
      body: fd,
    });
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      log('error', 'Jira attachment error', { status: upstream.status, err });
      return res.status(upstream.status).json({ error: 'Jira refused the attachments.' });
    }
    const data = await upstream.json();
    res.json({
      key,
      attached: (Array.isArray(data) ? data : []).map(a => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        content: a.content,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/issue-types (I) ─────────────────────────────────────────
router.get('/jira/issue-types', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const project = sanitizeProject(req.query.project);
  const fallback = [
    { id: 'fb-task', name: 'Task', iconUrl: null },
    { id: 'fb-bug', name: 'Bug', iconUrl: null },
    { id: 'fb-incident', name: 'Incident', iconUrl: null },
    { id: 'fb-service-request', name: 'Service Request', iconUrl: null },
    { id: 'fb-change', name: 'Change', iconUrl: null },
  ];
  if (!token) return res.json({ issueTypes: fallback, source: 'fallback', project });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/project/${project}`, {
      headers: jiraAuthHeaders(token),
    });
    if (!upstream.ok) return res.json({ issueTypes: fallback, source: 'fallback', project });
    const data = await upstream.json();
    const issueTypes = (data.issueTypes || []).map(t => ({
      id: t.id,
      name: t.name,
      iconUrl: t.iconUrl || null,
      subtask: t.subtask === true,
    }));
    res.json({
      issueTypes: issueTypes.length ? issueTypes : fallback,
      source: issueTypes.length ? 'jira' : 'fallback',
      project,
    });
  } catch {
    res.json({ issueTypes: fallback, source: 'fallback', project });
  }
});

// ─── GET /api/v1/jira/components (C) ──────────────────────────────────────────
router.get('/jira/components', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const project = sanitizeProject(req.query.project);
  if (!token) return res.json({ components: [], source: 'fallback', project });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/project/${project}/components`, {
      headers: jiraAuthHeaders(token),
    });
    if (!upstream.ok) return res.json({ components: [], source: 'fallback', project });
    const data = await upstream.json();
    const components = (Array.isArray(data) ? data : []).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      lead: c.lead?.displayName || null,
    }));
    res.json({ components, source: 'jira', project });
  } catch {
    res.json({ components: [], source: 'fallback', project });
  }
});

// ─── Watchers (W2) ────────────────────────────────────────────────────────────
router.get('/jira/issue/:key/watchers', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${key}/watchers`, {
      headers: jiraAuthHeaders(token),
    });
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: 'Failed to fetch watchers.' });
    const data = await upstream.json();
    res.json({
      key,
      watchCount: data.watchCount || 0,
      watchers: (data.watchers || []).map(w => ({
        accountId: w.accountId,
        displayName: w.displayName,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

const watcherActionSchema = z.object({ accountId: z.string().min(1).max(200) }).strict();
router.post('/jira/issue/:key/watchers', async (req, res, next) => {
  const parsed = watcherActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid watcher payload.' });
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  try {
    // Jira's add-watcher endpoint expects the accountId as a JSON string in the body
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${key}/watchers`, {
      method: 'POST',
      headers: jiraAuthHeaders(token),
      body: JSON.stringify(parsed.data.accountId),
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Failed to add watcher.' });
    res.json({ ok: true, key });
  } catch (err) {
    return next(err);
  }
});
router.delete('/jira/issue/:key/watchers/:accountId', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  const accountId = String(req.params.accountId || '').replace(/[^A-Za-z0-9:_-]/g, '');
  try {
    const upstream = await fetch(
      `${jiraBaseUrl()}/rest/api/3/issue/${key}/watchers?accountId=${encodeURIComponent(accountId)}`,
      {
        method: 'DELETE',
        headers: jiraAuthHeaders(token),
      }
    );
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: 'Failed to remove watcher.' });
    res.json({ ok: true, key });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/issue/:key/changelog (H) ────────────────────────────────
router.get('/jira/issue/:key/changelog', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  try {
    const upstream = await fetch(
      `${jiraBaseUrl()}/rest/api/3/issue/${key}?expand=changelog&fields=summary`,
      { headers: jiraAuthHeaders(token) }
    );
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: 'Failed to fetch changelog.' });
    const data = await upstream.json();
    const history = (data.changelog?.histories || []).map(h => ({
      id: h.id,
      author: h.author?.displayName || 'Unknown',
      created: h.created,
      changes: (h.items || []).map(i => ({ field: i.field, from: i.fromString, to: i.toString })),
    }));
    res.json({ key, total: data.changelog?.total ?? history.length, history });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/v1/jira/fields (F) ──────────────────────────────────────────────
// Returns all available Jira fields so the admin UI can decode custom field IDs.
router.get('/jira/fields', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  if (!token) return res.json({ fields: [], source: 'fallback' });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/field`, {
      headers: jiraAuthHeaders(token),
    });
    if (!upstream.ok) return res.json({ fields: [], source: 'fallback' });
    const data = await upstream.json();
    const fields = (Array.isArray(data) ? data : []).map(f => ({
      id: f.id,
      name: f.name,
      custom: f.custom === true,
      schema: f.schema?.type || null,
    }));
    res.json({ fields, source: 'jira' });
  } catch {
    res.json({ fields: [], source: 'fallback' });
  }
});

// ─── GET /api/v1/jsm/servicedesks (Q) ─────────────────────────────────────────
router.get('/jsm/servicedesks', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  if (!token) return res.json({ servicedesks: [], source: 'fallback' });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/servicedeskapi/servicedesk`, {
      headers: { ...jiraAuthHeaders(token), 'X-ExperimentalApi': 'opt-in' },
    });
    if (!upstream.ok) return res.json({ servicedesks: [], source: 'fallback' });
    const data = await upstream.json();
    res.json({
      servicedesks: (data.values || []).map(s => ({
        id: s.id,
        projectKey: s.projectKey,
        projectName: s.projectName,
      })),
      source: 'jira',
    });
  } catch {
    res.json({ servicedesks: [], source: 'fallback' });
  }
});

// ─── GET /api/v1/jsm/servicedesk/:id/queues (Q) ───────────────────────────────
router.get('/jsm/servicedesk/:id/queues', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  if (!token || !id) return res.json({ queues: [], source: 'fallback' });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/servicedeskapi/servicedesk/${id}/queue`, {
      headers: { ...jiraAuthHeaders(token), 'X-ExperimentalApi': 'opt-in' },
    });
    if (!upstream.ok) return res.json({ queues: [], source: 'fallback' });
    const data = await upstream.json();
    res.json({
      queues: (data.values || []).map(q => ({ id: q.id, name: q.name, count: q.issueCount || 0 })),
      source: 'jira',
    });
  } catch {
    res.json({ queues: [], source: 'fallback' });
  }
});

// ─── GET /api/v1/jsm/request/:key/csat (R) ────────────────────────────────────
router.get('/jsm/request/:key/csat', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const key = sanitizeIssueKey(req.params.key);
  if (!token || !key) return res.json({ available: false });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/servicedeskapi/request/${key}/feedback`, {
      headers: { ...jiraAuthHeaders(token), 'X-ExperimentalApi': 'opt-in' },
    });
    if (!upstream.ok) return res.json({ available: false, key });
    const data = await upstream.json();
    res.json({
      available: true,
      key,
      rating: data.rating?.value ?? null,
      max: data.rating?.scale?.max ?? 5,
      comment: data.comment?.body ?? null,
    });
  } catch {
    res.json({ available: false, key });
  }
});

// ─── GET /api/v1/jira/versions (V) ────────────────────────────────────────────
router.get('/jira/versions', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const project = sanitizeProject(req.query.project);
  if (!token) return res.json({ versions: [], source: 'fallback', project });
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/project/${project}/versions`, {
      headers: jiraAuthHeaders(token),
    });
    if (!upstream.ok) return res.json({ versions: [], source: 'fallback', project });
    const data = await upstream.json();
    const versions = (Array.isArray(data) ? data : []).map(v => ({
      id: v.id,
      name: v.name,
      released: v.released === true,
      archived: v.archived === true,
      releaseDate: v.releaseDate || null,
    }));
    res.json({ versions, source: 'jira', project });
  } catch {
    res.json({ versions: [], source: 'fallback', project });
  }
});

// ─── GET /api/v1/jira/issue/:key/worklog (WL) ─────────────────────────────────
router.get('/jira/issue/:key/worklog', async (req, res, next) => {
  const token = requireJira(res);
  if (!token) return;
  const key = sanitizeIssueKey(req.params.key);
  try {
    const upstream = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${key}/worklog`, {
      headers: jiraAuthHeaders(token),
    });
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: 'Failed to fetch worklog.' });
    const data = await upstream.json();
    const entries = (data.worklogs || []).map(w => ({
      id: w.id,
      author: w.author?.displayName || 'Unknown',
      timeSeconds: w.timeSpentSeconds || 0,
      timeSpent: w.timeSpent || '',
      started: w.started || null,
    }));
    // Aggregate per author
    const byAuthor = {};
    for (const e of entries) byAuthor[e.author] = (byAuthor[e.author] || 0) + e.timeSeconds;
    const totals = Object.entries(byAuthor)
      .map(([author, seconds]) => ({
        author,
        seconds,
        hours: Math.round(seconds / 360) / 10,
      }))
      .sort((a, b) => b.seconds - a.seconds);
    res.json({
      key,
      totalSeconds: entries.reduce((s, e) => s + e.timeSeconds, 0),
      entries,
      totals,
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/submit-ticket ──────────────────────────────────────────────────
router.post('/submit-ticket', async (req, res, next) => {
  const parsed = submitTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid ticket payload.' });
  }

  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL || 'https://pomelofashion.atlassian.net';

  if (!token) {
    return res.status(503).json({ error: 'Jira API token is not configured on the server.' });
  }

  try {
    const upstream = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(parsed.data),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      log('error', 'Jira upstream error', { status: upstream.status, data });
      return res.status(upstream.status).json({ error: 'Failed to submit ticket to Jira.' });
    }

    return res.json({ key: data.key, url: `${baseUrl}/browse/${data.key}` });
  } catch (err) {
    return next(err);
  }
});

export default router;
