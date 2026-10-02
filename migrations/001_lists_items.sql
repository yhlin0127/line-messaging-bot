-- Phase 3: shared notes lists + items (one shared list per LINE scope)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_scope_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'shared',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lists_line_scope_id_unique UNIQUE (line_scope_id),
  CONSTRAINT lists_kind_check CHECK (kind IN ('shared', 'grocery', 'todo'))
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_line_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_list_id_created_at_idx
  ON items (list_id, created_at);
