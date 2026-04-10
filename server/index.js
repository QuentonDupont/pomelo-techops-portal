// server/index.js
// Pomelo TechOps — Backend-For-Frontend (BFF) proxy
//
// Holds Jira and Anthropic credentials server-side so they never appear
// in the client bundle. Sprint 1 of the APEX security audit (2026-04-06).
//
// Start: node server/index.js
// Dev:   npm run dev:all  (starts Vite + this server concurrently)
//
// Required env vars (no VITE_ prefix — never bundled by Vite):
//   JIRA_API_TOKEN      Base64-encoded Atlassian token (user:apikey)
//   JIRA_BASE_URL       Defaults to https://pomelofashion.atlassian.net
//   JIRA_PROJECT_ID     Defaults to 10245
//   JIRA_PROJECT_KEY    Defaults to PESD1
//   JIRA_REPORTER_ID    Atlassian account ID for the reporter field
//   ANTHROPIC_API_KEY   Anthropic API key (sk-ant-...)
//   ALLOWED_ORIGIN      Restrict CORS (defaults to http://localhost:5173)

import express from 'express';
import cors from 'cors';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load .env.local from the project root (Node.js doesn't load this automatically)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '..', '.env.local') });

// ─── Backwards-compatibility bridge ───────────────────────────────────────────
// Sprint 1 renamed secrets from VITE_ to non-VITE_ so they're not bundled by
// Vite. If the old VITE_ vars are still in .env.local, use them as a fallback
// so the server works immediately. Warn so it's clear migration is pending.
if (!process.env.ANTHROPIC_API_KEY && process.env.VITE_ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
  console.warn(
    '[BFF] ⚠  Using VITE_ANTHROPIC_API_KEY as fallback. Rename it to ANTHROPIC_API_KEY in .env.local to silence this warning.'
  );
}
if (!process.env.JIRA_API_TOKEN && process.env.VITE_JIRA_API_TOKEN) {
  process.env.JIRA_API_TOKEN = process.env.VITE_JIRA_API_TOKEN;
  console.warn(
    '[BFF] ⚠  Using VITE_JIRA_API_TOKEN as fallback. Rename it to JIRA_API_TOKEN in .env.local to silence this warning.'
  );
}

const app = express();
const PORT = process.env.BFF_PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In dev, Vite proxies /api/* so CORS is not exercised.
// In prod, restrict to your deployed frontend origin via ALLOWED_ORIGIN.
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// 20 MB limit to accommodate base64-encoded PDF payloads
app.use(express.json({ limit: '20mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    jira: Boolean(process.env.JIRA_API_TOKEN),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

// ─── POST /api/submit-ticket ──────────────────────────────────────────────────
// Accepts the pre-built Jira issue body from the client (ADF-formatted fields)
// and forwards it to the Atlassian REST API with the secret token attached.
app.post('/api/submit-ticket', async (req, res) => {
  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL || 'https://pomelofashion.atlassian.net';

  if (!token) {
    return res
      .status(503)
      .json({
        error:
          'Jira API token is not configured on the server. Set JIRA_API_TOKEN in your environment.',
      });
  }

  try {
    const upstream = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const msg =
        data?.errorMessages?.[0] ||
        Object.values(data?.errors || {})[0] ||
        `Jira API error ${upstream.status}`;
      return res.status(upstream.status).json({ error: msg });
    }

    return res.json({ key: data.key, url: `${baseUrl}/browse/${data.key}` });
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Network error — could not reach Jira.' });
  }
});

// ─── POST /api/extract-content ────────────────────────────────────────────────
// Accepts { model, max_tokens, messages, betas? } from the client (file already
// base64-encoded in the browser via FileReader) and forwards to Anthropic.
// The optional `betas` array is used to set the anthropic-beta header (e.g.
// ['pdfs-2024-09-25'] for PDF document blocks) and is stripped before forwarding.
app.post('/api/extract-content', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res
      .status(503)
      .json({
        error:
          'Anthropic API key is not configured on the server. Set ANTHROPIC_API_KEY in your environment.',
      });
  }

  try {
    // Extract betas from the body so they become a header, not a body field
    const { betas, ...anthropicBody } = req.body;

    const anthropicHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
    if (Array.isArray(betas) && betas.length > 0) {
      anthropicHeaders['anthropic-beta'] = betas.join(',');
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders,
      body: JSON.stringify(anthropicBody),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res
        .status(upstream.status)
        .json({ error: err?.error?.message || `HTTP ${upstream.status}` });
    }

    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    return res
      .status(502)
      .json({ error: err?.message || 'Network error — could not reach Anthropic.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[BFF] Pomelo TechOps API proxy → http://localhost:${PORT}`);
  console.log(`[BFF] Jira configured:     ${Boolean(process.env.JIRA_API_TOKEN)}`);
  console.log(`[BFF] Anthropic configured: ${Boolean(process.env.ANTHROPIC_API_KEY)}`);
});
