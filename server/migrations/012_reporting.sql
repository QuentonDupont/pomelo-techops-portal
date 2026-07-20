-- Reporting indexes. All KPIs are computed from columns persisted by earlier
-- phases (SLA engine, CSAT, change outcomes) — no materialized views needed
-- at portal volume. Forward-only.

CREATE INDEX IF NOT EXISTS tickets_created_at_idx  ON tickets(created_at);
CREATE INDEX IF NOT EXISTS tickets_resolved_at_idx ON tickets(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS tickets_breach_idx      ON tickets(record_type)
  WHERE response_breached OR resolution_breached;
