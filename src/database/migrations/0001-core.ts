import type { Migration } from './migration';

/**
 * Core schema (O-043): tables and columns that do not depend on Open decisions.
 * - No lifecycle column on collection_types/categories yet (O-047(b), pending O-025).
 * - `icon` columns stay NULL until an icon set is chosen (O-046/O-003).
 * - Template-dependent entry columns arrive in Phase 3.
 * Pre-release: may be edited until released (O-040). After release, add a new migration instead.
 */
const migration: Migration = {
  version: 1,
  name: 'core',
  sql: `
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE collection_types (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NULL UNIQUE,
  name TEXT NULL,
  icon TEXT NULL,
  accent_color TEXT NULL CHECK (accent_color IS NULL OR accent_color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- Built-in rows: reserved ID namespace and a key. Custom rows: outside it, with a name (O-020).
  CHECK (
    (is_system = 1 AND id GLOB '4d454d30-0000-8000-8*' AND key IS NOT NULL)
    OR
    (is_system = 0 AND id NOT GLOB '4d454d30-0000-8000-8*' AND name IS NOT NULL AND length(trim(name)) > 0)
  )
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NULL UNIQUE,
  name TEXT NULL,
  icon TEXT NULL,
  color TEXT NULL CHECK (color IS NULL OR color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  template_key TEXT NOT NULL CHECK (template_key IN ('NOTE', 'TASK', 'WISHLIST', 'EVENT', 'PREFERENCE')),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (is_system = 1 AND id GLOB '4d454d30-0000-8000-8*' AND key IS NOT NULL)
    OR
    (is_system = 0 AND id NOT GLOB '4d454d30-0000-8000-8*' AND name IS NOT NULL AND length(trim(name)) > 0)
  )
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY NOT NULL,
  collection_type_id TEXT NOT NULL REFERENCES collection_types(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NULL,
  icon_override TEXT NULL,
  accent_color_override TEXT NULL CHECK (accent_color_override IS NULL OR accent_color_override GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NULL,
  CHECK (id NOT GLOB '4d454d30-0000-8000-8*')
);
CREATE INDEX collections_archived_sort ON collections (archived_at, sort_order);
CREATE INDEX collections_type ON collections (collection_type_id);

CREATE TABLE entries (
  id TEXT PRIMARY KEY NOT NULL,
  collection_id TEXT NULL REFERENCES collections(id) ON DELETE CASCADE,
  category_id TEXT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NULL,
  CHECK (id NOT GLOB '4d454d30-0000-8000-8*'),
  -- Inbox invariant (B-006): unsorted (neither) or assigned (both); never half-assigned.
  CHECK (
    (collection_id IS NULL AND category_id IS NULL)
    OR
    (collection_id IS NOT NULL AND category_id IS NOT NULL)
  )
);
CREATE INDEX entries_collection_category ON entries (collection_id, category_id, archived_at, updated_at);
CREATE INDEX entries_archived_pinned ON entries (archived_at, is_pinned, updated_at);
`,
};

export default migration;
