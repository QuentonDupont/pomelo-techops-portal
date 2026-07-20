-- Problem management. Introduces the record_type discriminator (D1): problems
-- (and later changes) are ticket rows so comments/timeline/links/attachments
-- machinery is reused. Default ticket queries filter to record_type='ticket'.
-- Forward-only.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'ticket';  -- ticket|problem|change

CREATE INDEX IF NOT EXISTS tickets_record_type_idx ON tickets(record_type);

CREATE TABLE IF NOT EXISTS problem_details (
  ticket_id   UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  root_cause  TEXT,
  workaround  TEXT,
  known_error BOOLEAN NOT NULL DEFAULT FALSE,
  impact      TEXT
);
