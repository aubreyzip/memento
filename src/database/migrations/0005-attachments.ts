import type { Migration } from './migration';

/**
 * Photo attachments (DATABASE_DESIGN §3.7, O-008, O-037). Rows are removed with their entry
 * (ON DELETE CASCADE); the encrypted files are removed by the photo service after the delete
 * commits. Paths are generated (`media/<uuid>.bin`), never user input. MIME types and the
 * encryption format are checked in code from one definition (O-056), not by CHECK constraints.
 * New table only: no rebuild, so no cascade risk (DATABASE_DESIGN §8).
 * Pre-release: may be edited until released (O-040).
 */
const migration: Migration = {
  version: 5,
  name: 'attachments',
  sql: `
CREATE TABLE entry_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL UNIQUE CHECK (relative_path GLOB 'media/?*'),
  thumbnail_path TEXT NOT NULL UNIQUE CHECK (thumbnail_path GLOB 'media/?*'),
  mime_type TEXT NOT NULL CHECK (mime_type GLOB 'image/?*'),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes >= 0),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  content_hash TEXT NOT NULL,
  encryption TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (id NOT GLOB '4d454d30-0000-8000-8*')
);
CREATE INDEX entry_attachments_entry ON entry_attachments (entry_id, sort_order);
`,
};

export default migration;
