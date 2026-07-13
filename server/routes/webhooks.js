// server/routes/webhooks.js
// Jira webhook intake + the polled event feed, mounted at /api/v1. The queue
// is a bounded in-memory ring buffer (fine for a single instance; move to
// Postgres if the BFF ever scales horizontally).

import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { log } from '../lib/log.js';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// ─── Webhook event queue + POST /api/v1/jira/webhook (W) ─────────────────────
// Jira posts here when issues change. We store the last 200 events in memory
// and expose them via GET /api/v1/events?since=ISO so the client can pick up
// changes without polling Jira itself.
const WEBHOOK_EVENTS = [];
const MAX_EVENTS = 200;
let LAST_WEBHOOK_AT = null;

const pushWebhookEvent = evt => {
  WEBHOOK_EVENTS.unshift(evt);
  if (WEBHOOK_EVENTS.length > MAX_EVENTS) WEBHOOK_EVENTS.length = MAX_EVENTS;
  LAST_WEBHOOK_AT = new Date().toISOString();
};

// Webhooks carry no session cookie, so they authenticate with a shared secret:
// configure the Jira webhook URL as …/api/v1/jira/webhook?token=<secret> (or
// send an X-Webhook-Token header). Production refuses all webhook traffic
// until JIRA_WEBHOOK_SECRET is set; dev without the secret stays open.
const webhookAuthorized = req => {
  const secret = process.env.JIRA_WEBHOOK_SECRET || '';
  if (!secret) return !isProduction;
  const provided = String(req.query.token || req.get('x-webhook-token') || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

router.post('/jira/webhook', (req, res) => {
  if (!webhookAuthorized(req)) {
    log('error', 'Jira webhook rejected: bad or missing token');
    return res.status(401).json({ error: 'Invalid webhook token.' });
  }
  const body = req.body || {};
  const event = {
    id: 'wh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    ts: new Date().toISOString(),
    type: body.webhookEvent || body.issue_event_type_name || 'unknown',
    issueKey: body.issue?.key || body.key || null,
    issueStatus: body.issue?.fields?.status?.name || null,
    issueAssignee: body.issue?.fields?.assignee?.displayName || null,
    issueSummary: body.issue?.fields?.summary || null,
    commentBody: body.comment?.body || null,
    commentAuthor: body.comment?.author?.displayName || null,
    user: body.user?.displayName || null,
  };
  pushWebhookEvent(event);
  log('info', 'Jira webhook received', { type: event.type, issueKey: event.issueKey });
  res.json({ ok: true });
});

router.get('/events', (req, res) => {
  const since = String(req.query.since || '');
  const sinceTs = since ? new Date(since).getTime() : 0;
  const events = WEBHOOK_EVENTS.filter(e => !sinceTs || new Date(e.ts).getTime() > sinceTs);
  res.json({
    fetchedAt: new Date().toISOString(),
    lastWebhookAt: LAST_WEBHOOK_AT,
    count: events.length,
    events: events.slice(0, 50),
  });
});

export default router;
