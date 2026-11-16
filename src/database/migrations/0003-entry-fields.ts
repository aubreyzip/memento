import type { Migration } from './migration';

/**
 * Template-dependent entry columns (O-021 to O-024, O-010, O-011) and the search column
 * (O-026), deferred from the core schema by O-043.
 * - Status, priority, and recurrence values are checked in the domain from one table (O-056),
 *   not by CHECK constraints here, so a later change to the option lists needs no table rebuild.
 *   CHECKs cover only structure: formats, non-negative prices, and ordered ranges.
 * - `date_recurrence` defaults to NONE, so existing rows stay valid.
 * - `search_text` holds the folded title, description, and location, written by the repository.
 * Plain ADD COLUMN: no table rebuild, so no cascade risk (DATABASE_DESIGN §8).
 * Pre-release: may be edited until released (O-040).
 */
const migration: Migration = {
  version: 3,
  name: 'entry-fields',
  sql: `
ALTER TABLE entries ADD COLUMN status TEXT NULL;
ALTER TABLE entries ADD COLUMN priority TEXT NULL;
ALTER TABLE entries ADD COLUMN date_start TEXT NULL
  CHECK (date_start IS NULL OR date_start GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
ALTER TABLE entries ADD COLUMN date_end TEXT NULL
  CHECK (date_end IS NULL OR (date_end GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND date_start IS NOT NULL AND date_end >= date_start));
ALTER TABLE entries ADD COLUMN starts_at_utc TEXT NULL;
ALTER TABLE entries ADD COLUMN ends_at_utc TEXT NULL
  CHECK (ends_at_utc IS NULL OR (starts_at_utc IS NOT NULL AND ends_at_utc >= starts_at_utc));
ALTER TABLE entries ADD COLUMN date_recurrence TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE entries ADD COLUMN price_minor INTEGER NULL
  CHECK (price_minor IS NULL OR (typeof(price_minor) = 'integer' AND price_minor >= 0));
-- A price always has a currency, and a currency only comes with a price.
ALTER TABLE entries ADD COLUMN currency_code TEXT NULL
  CHECK ((currency_code IS NULL AND price_minor IS NULL)
    OR (currency_code IS NOT NULL AND currency_code GLOB '[A-Z][A-Z][A-Z]'
      AND price_minor IS NOT NULL));
ALTER TABLE entries ADD COLUMN location_text TEXT NULL;
ALTER TABLE entries ADD COLUMN completed_at TEXT NULL;
ALTER TABLE entries ADD COLUMN search_text TEXT NOT NULL DEFAULT '';

CREATE INDEX entries_status_priority ON entries (status, priority);
CREATE INDEX entries_date_start ON entries (date_start);
CREATE INDEX entries_starts_at ON entries (starts_at_utc);
`,
};

export default migration;
