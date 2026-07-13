-- Board workflow: adopt the 11-status PESD1 vocabulary portal-wide.
-- Completed work maps to Live optimistically — "Closed - Won't Do" is reserved
-- for tickets explicitly closed as won't-do (no historical signal separates
-- the two). Forward-only; runs once via server/migrate.js.

UPDATE tickets SET status = CASE status
  WHEN 'Open' THEN 'To Do'
  WHEN 'Pending' THEN 'Waiting for Customer'
  WHEN 'Resolved' THEN 'Live'
  WHEN 'Done' THEN 'Live'
  WHEN 'Closed' THEN 'Live'
  ELSE status
END;

ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'To Do';

-- Board v1 fields. watchers/labels are JSONB string arrays; rank orders cards
-- within a column (sparse doubles so future drag-reorder can insert between).
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS labels           JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS due_date         DATE,
  ADD COLUMN IF NOT EXISTS problem_category TEXT,
  ADD COLUMN IF NOT EXISTS issue_type       TEXT NOT NULL DEFAULT 'Task',
  ADD COLUMN IF NOT EXISTS rank             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS watchers         JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_id        UUID REFERENCES tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_result   TEXT,
  ADD COLUMN IF NOT EXISTS expected_result  TEXT;

CREATE INDEX IF NOT EXISTS tickets_due_date_idx ON tickets(due_date);
CREATE INDEX IF NOT EXISTS tickets_parent_idx   ON tickets(parent_id);

-- Typed links between local tickets. One row per link; the UI renders the
-- inverse label when viewed from the target side.
CREATE TABLE IF NOT EXISTS ticket_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  target_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  relation   TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id, relation)
);
CREATE INDEX IF NOT EXISTS ticket_links_source_idx ON ticket_links(source_id);
CREATE INDEX IF NOT EXISTS ticket_links_target_idx ON ticket_links(target_id);
