-- server/migrations/001_init.sql
-- Initial schema for the Pomelo TechOps Portal production backend.
-- Mirrors the shapes the frontend currently keeps in localStorage so the
-- client rewire is mechanical. Idempotent: safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ─── Roles ────────────────────────────────────────────────────────────────────
-- Capability set stored as a JSONB array of capability id strings (the same
-- ids defined in src/rbac.js). is_system roles are protected from deletion.
CREATE TABLE IF NOT EXISTS roles (
  id            TEXT PRIMARY KEY,           -- e.g. 'role_admin' (matches rbac.js)
  name          TEXT UNIQUE NOT NULL,       -- machine name, e.g. 'admin'
  label         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  color         TEXT NOT NULL DEFAULT '#52525B',
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  capabilities  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,     -- always stored lowercase
  password_hash   TEXT,                     -- bcrypt; NULL until invite accepted
  role_id         TEXT NOT NULL REFERENCES roles(id),
  department      TEXT NOT NULL DEFAULT 'IT & Technology',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role_id);

-- ─── Tickets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key              TEXT UNIQUE NOT NULL,    -- human key e.g. TKT-2026-0042
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  category         TEXT,
  priority         TEXT NOT NULL DEFAULT 'Medium',
  status           TEXT NOT NULL DEFAULT 'Open',
  requester_name   TEXT,
  requester_email  TEXT,
  assignee_name    TEXT,
  assignee_email   TEXT,
  department       TEXT,
  shop             TEXT,
  platforms        JSONB NOT NULL DEFAULT '[]'::jsonb,
  jira_key         TEXT,                    -- set when mirrored to Jira (dual-run)
  jira_sync_state  TEXT NOT NULL DEFAULT 'local-only',  -- local-only|syncing|synced|error
  jira_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_assignee_idx ON tickets(assignee_email);
CREATE INDEX IF NOT EXISTS tickets_requester_idx ON tickets(requester_email);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_jira_key_idx ON tickets(jira_key) WHERE jira_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author      TEXT,
  body        TEXT NOT NULL,
  internal    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx ON ticket_comments(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  actor       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_timeline_ticket_idx ON ticket_timeline(ticket_id);

-- ─── Attachments (S3-backed; replaces base64-in-localStorage) ──────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID REFERENCES tickets(id) ON DELETE CASCADE,
  doc_id        UUID,
  filename      TEXT NOT NULL,
  content_type  TEXT,
  size_bytes    BIGINT,
  s3_key        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attachments_ticket_idx ON attachments(ticket_id);

-- ─── Documentation (Doc Studio) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  category      TEXT,
  visibility    TEXT NOT NULL DEFAULT 'Public',
  tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon          TEXT,
  description   TEXT,
  author        TEXT,
  status        TEXT NOT NULL DEFAULT 'Active',  -- Active|Archived
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      UUID NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  version_id  TEXT NOT NULL,
  title       TEXT,
  content     TEXT,
  author      TEXT,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doc_versions_doc_idx ON doc_versions(doc_id);

-- ─── Audit log (append-only) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);

-- ─── Email tokens (verify | invite | reset) ───────────────────────────────────
-- Only the hash of the token is stored; the raw token goes in the emailed link.
CREATE TABLE IF NOT EXISTS email_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  type        TEXT NOT NULL,               -- verify | invite | reset
  token_hash  TEXT NOT NULL,
  role_id     TEXT REFERENCES roles(id),   -- for invites: role to assign on accept
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_tokens_hash_idx ON email_tokens(token_hash);
