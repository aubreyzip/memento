import type { Migration } from './migration';

/**
 * Archive lifecycle for collection types and categories (O-025, O-047(b)): one `archived_at`
 * column, as on collections and entries, in place of the earlier `is_active` idea. Archived
 * types and categories are hidden from new selections but stay on existing rows.
 * Plain ADD COLUMN: no table rebuild, so no cascade risk (DATABASE_DESIGN §8).
 * Pre-release: may be edited until released (O-040).
 */
const migration: Migration = {
  version: 2,
  name: 'catalog-lifecycle',
  sql: `
ALTER TABLE collection_types ADD COLUMN archived_at TEXT NULL;
ALTER TABLE categories ADD COLUMN archived_at TEXT NULL;
CREATE INDEX collection_types_archived_sort ON collection_types (archived_at, sort_order);
CREATE INDEX categories_archived_sort ON categories (archived_at, sort_order);
`,
};

export default migration;
