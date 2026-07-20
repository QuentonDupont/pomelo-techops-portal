-- Incident management depth: severity + major-incident flag on tickets, a
-- dedicated communications log (distinct from work-note comments), and a
-- postmortem doc link. Forward-only.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS severity           TEXT,     -- SEV1..SEV4, incidents only
  ADD COLUMN IF NOT EXISTS major_incident     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS postmortem_doc_id  UUID REFERENCES docs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tickets_major_incident_idx ON tickets(major_incident) WHERE major_incident;

-- Public status updates during an incident (what we'd tell stakeholders),
-- kept separate from ticket_comments so comms history reads clean.
CREATE TABLE IF NOT EXISTS incident_updates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author         TEXT,
  body           TEXT NOT NULL,
  status_at_post TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incident_updates_ticket_idx ON incident_updates(ticket_id, created_at DESC);
