-- Service catalog: structured request types with per-type dynamic form fields.
-- Submitting a catalog item creates a normal ticket carrying request_type_id
-- and the requester's structured answers in form_values. Forward-only.

CREATE TABLE IF NOT EXISTS request_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  icon              TEXT,
  category          TEXT NOT NULL DEFAULT 'General',
  -- Field schema: [{id,label,type:'text'|'textarea'|'select'|'date'|'checkbox',options:[],required:bool}]
  fields            JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ticket defaults applied on submit: {priority, issueType, labels, assigneeEmail, category}
  defaults          JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approver_email    TEXT,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort              INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS request_type_id UUID REFERENCES request_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_values     JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS tickets_request_type_idx ON tickets(request_type_id);
