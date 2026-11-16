import type { Migration } from './migration';

/**
 * Entry links and tags (DATABASE_DESIGN §3.6, §3.8, §3.9; O-022, O-023, O-027).
 * - Links and tag assignments are removed with their entry (ON DELETE CASCADE).
 * - Tags are unique by their folded name (O-026), so "Şule" and "sule" are one tag. Tags no
 *   entry uses are deleted by the repositories (cleanup policy: no unused tags are kept).
 * New tables only: no rebuild, so no cascade risk (DATABASE_DESIGN §8).
 * Pre-release: may be edited until released (O-040).
 */
const migration: Migration = {
  version: 4,
  name: 'links-tags',
  sql: `
CREATE TABLE entry_links (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  title TEXT NULL,
  url TEXT NOT NULL CHECK (url GLOB 'http://?*' OR url GLOB 'https://?*'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (id NOT GLOB '4d454d30-0000-8000-8*')
);
CREATE INDEX entry_links_entry ON entry_links (entry_id, sort_order);

CREATE TABLE tags (
  id TEXT PRIMARY KEY NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE CHECK (length(normalized_name) > 0),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  created_at TEXT NOT NULL,
  CHECK (id NOT GLOB '4d454d30-0000-8000-8*')
);

CREATE TABLE entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag_id)
);
CREATE INDEX entry_tags_tag ON entry_tags (tag_id);
`,
};

export default migration;
