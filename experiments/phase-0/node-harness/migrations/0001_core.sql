-- Phase 0 spike schema: a representative subset of DATABASE_DESIGN.md, not the final schema.
CREATE TABLE collection_types (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT UNIQUE,
  name TEXT,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1))
);
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT UNIQUE,
  name TEXT,
  template_key TEXT NOT NULL CHECK (template_key IN ('NOTE','TASK','WISHLIST','EVENT','PREFERENCE')),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1))
);
CREATE TABLE collections (
  id TEXT PRIMARY KEY NOT NULL,
  collection_type_id TEXT NOT NULL REFERENCES collection_types(id) ON DELETE RESTRICT,
  name TEXT NOT NULL
);
CREATE TABLE entries (
  id TEXT PRIMARY KEY NOT NULL,
  collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  CHECK ((collection_id IS NULL AND category_id IS NULL) OR (collection_id IS NOT NULL AND category_id IS NOT NULL))
);
CREATE TABLE entry_links (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);
