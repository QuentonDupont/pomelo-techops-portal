-- Change management. Changes are ticket rows (record_type='change', key
-- CHG-YYYY-NNNN) with a 1:1 change_details extension. Approval rides the
-- generic approvals table (subject_type='change'); links to tickets/problems
-- ride ticket_links, links to assets ride asset_tickets. Forward-only.

CREATE TABLE IF NOT EXISTS change_details (
  ticket_id      UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  change_type    TEXT NOT NULL DEFAULT 'normal',   -- standard|normal|emergency
  risk           TEXT NOT NULL DEFAULT 'medium',   -- low|medium|high
  rollout_plan   TEXT,
  rollback_plan  TEXT,
  test_plan      TEXT,
  window_start   TIMESTAMPTZ,
  window_end     TIMESTAMPTZ,
  approval_state TEXT NOT NULL DEFAULT 'draft',    -- draft|pending|approved|rejected
  outcome        TEXT                              -- successful|rolled-back|failed
);
CREATE INDEX IF NOT EXISTS change_details_window_idx ON change_details(window_start);
