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
