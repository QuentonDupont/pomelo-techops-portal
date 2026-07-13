-- Needs-review flag for docs. The client stores it as a small object
-- ({ reason, completed, flaggedAt, ... }) or null when cleared, so JSONB
-- mirrors the mock-mode shape exactly.
ALTER TABLE docs ADD COLUMN IF NOT EXISTS review JSONB;
