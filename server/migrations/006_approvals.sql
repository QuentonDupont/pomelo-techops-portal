-- Generic approvals primitive. subject_type distinguishes plain ticket
-- approvals (catalog requires_approval) from change-request approvals
-- (Phase 7); subject_id always references tickets(id) because changes are
-- ticket rows (record_type discriminator, migration 009). Forward-only.

CREATE TABLE IF NOT EXISTS approvals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type   TEXT NOT NULL DEFAULT 'ticket',
  subject_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  approver_email TEXT NOT NULL,
  requested_by   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|cancelled
  comment        TEXT,
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id, approver_email)
);
CREATE INDEX IF NOT EXISTS approvals_approver_idx ON approvals(approver_email, status);
CREATE INDEX IF NOT EXISTS approvals_subject_idx ON approvals(subject_type, subject_id);
