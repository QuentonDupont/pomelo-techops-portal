-- Native CSAT: one survey row per resolved ticket, created on transition into
-- a satisfied-resolution status (not "Closed - Won't Do"). The requester rates
-- 1–5 via bell prompt or tokenized email link. Forward-only.

CREATE TABLE IF NOT EXISTS csat_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  token_hash      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS csat_requester_idx ON csat_responses(requester_email) WHERE responded_at IS NULL;
