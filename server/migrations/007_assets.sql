-- IT asset management (CMDB-lite): asset registry with lifecycle status,
-- assignment history, and ticket linking. Forward-only.

CREATE TABLE IF NOT EXISTS assets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag              TEXT NOT NULL UNIQUE,      -- AST-0001
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'hardware',  -- hardware|software|license
  status           TEXT NOT NULL DEFAULT 'in-stock',  -- in-stock|assigned|repair|retired
  serial           TEXT,
  model            TEXT,
  vendor           TEXT,
  assignee_email   TEXT,
  assignee_name    TEXT,
  purchase_date    DATE,
  warranty_expires DATE,
  cost             NUMERIC(12,2),
  notes            TEXT,
  meta             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_status_idx   ON assets(status);
CREATE INDEX IF NOT EXISTS assets_assignee_idx ON assets(assignee_email);

-- Assignment history: one open row (returned_at IS NULL) per assigned asset.
CREATE TABLE IF NOT EXISTS asset_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  user_name   TEXT,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS asset_assignments_asset_idx ON asset_assignments(asset_id, assigned_at DESC);

-- Asset ↔ ticket links (also carries change ↔ asset links in Phase 7,
-- since changes are ticket rows).
CREATE TABLE IF NOT EXISTS asset_tickets (
  asset_id   UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, ticket_id)
);
CREATE INDEX IF NOT EXISTS asset_tickets_ticket_idx ON asset_tickets(ticket_id);
