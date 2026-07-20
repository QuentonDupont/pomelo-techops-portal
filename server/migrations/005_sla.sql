-- SLA engine + persisted notifications.
-- sla_policies: per-priority response/resolution targets in minutes, editable
-- in the portal (seeded from src/lib/constants.js SLA_TARGETS_HOURS).
-- Ticket SLA columns hold persisted deadlines; countdowns are computed live
-- client-side. sla_warned dedupes approaching/breach notifications.
-- notifications: server-originated events (SLA, approvals, CSAT) polled by
-- the bell. Forward-only.

CREATE TABLE IF NOT EXISTS sla_policies (
  priority           TEXT PRIMARY KEY,
  response_minutes   INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sla_policies (priority, response_minutes, resolution_minutes) VALUES
  ('Critical', 15, 240),
  ('High', 60, 480),
  ('Medium', 240, 960),
  ('Low', 480, 2400)
ON CONFLICT (priority) DO NOTHING;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS first_response_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_due_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_due_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_ms       BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_breached   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolution_breached BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sla_warned          JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill terminal timestamps so historical MTTR is computable.
UPDATE tickets SET resolved_at = updated_at
WHERE resolved_at IS NULL
  AND status IN ('Live', 'Closed - Won''t Do', 'Resolved', 'Done', 'Closed');

CREATE INDEX IF NOT EXISTS tickets_resolution_due_idx
  ON tickets(resolution_due_at) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  ticket_id  UUID REFERENCES tickets(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_email, created_at DESC);
