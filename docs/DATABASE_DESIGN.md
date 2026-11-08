# Database Design — Memento

**Version:** 0.1  
**Date:** 8 November 2026  
**Database:** SQLite with SQLCipher in production-style builds  
**Status:** Proposed logical schema; validate SQL types/indexes during implementation.

## 1. Design goals

- Local-first persistence with no remote database.
- Support people, spaces, projects, events, general, and custom collection types.
- Support predefined and user-defined categories without arbitrary schemas.
- Support Inbox entries that are not yet assigned.
- Keep structured entry fields optional and template-driven.
- Store relationships in normalized tables.
- Support full and collection-level backup/restore.
- Preserve data safely through versioned migrations.

## 2. Entity relationship diagram

**Phase 1 implementation (slice 5a, migration 0001):** as O-043 below, plus O-047(b): `collection_types` and `categories` have no lifecycle column yet (`is_active` vs `archived_at` waits for O-025), `icon` columns stay NULL until O-046/O-003, and CHECK constraints enforce the reserved built-in ID namespace (`id GLOB '4d454d30-0000-8000-8*'` for system rows only). Built-in rows store no display name; names come from translation resources.

**Phase 1 scope (Confirmed O-043):** the first migration creates `app_settings`, `collection_types`, `categories`, `collections`, and `entries` with core columns only (identity, Inbox assignment, title, description, pin/archive, timestamps). The template-dependent entry columns and the remaining tables in §3 are added by later migrations in the phases that need them.

See [`diagrams/data-model.mmd`](./diagrams/data-model.mmd).

## 3. Entities and tables

### 3.1 `app_settings`

Stores non-secret local application preferences.

| Column | Type | Rules / meaning |
|---|---|---|
| `key` | TEXT | Primary key. |
| `value` | TEXT | Serialized simple preference value; never store encryption key material here. |
| `updated_at` | TEXT | UTC ISO-8601 timestamp. |

Example keys: `language`, `theme`, `biometric_lock_enabled`, `auto_lock_timeout_seconds`, `default_currency_code`.

### 3.2 `collection_types`

Defines built-in and custom collection types.

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `key` | TEXT | Stable unique key for system types; nullable for custom types or generated stable key. |
| `name` | TEXT | Display name; localized system names should be resolved through translation keys rather than storing one language as the canonical system label. |
| `icon` | TEXT | Icon identifier from an approved icon set. |
| `accent_color` | TEXT | Optional validated hex color. |
| `is_system` | INTEGER | Boolean. |
| `is_active` | INTEGER | Boolean; supports deactivation/archive. |
| `sort_order` | INTEGER | UI ordering. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |
| `updated_at` | TEXT | UTC ISO-8601 timestamp. |

Built-in keys: `PERSON`, `SPACE`, `PROJECT`, `EVENT`, `GENERAL`.

### 3.3 `collections`

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `collection_type_id` | TEXT | Required FK to `collection_types.id`, `ON DELETE RESTRICT`. A type in use cannot be deleted (SRS FR-015). |
| `name` | TEXT | Required, trimmed, non-empty. |
| `description` | TEXT | Nullable. |
| `icon_override` | TEXT | Nullable. |
| `accent_color_override` | TEXT | Nullable validated hex. |
| `sort_order` | INTEGER | User-defined ordering. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |
| `updated_at` | TEXT | UTC ISO-8601 timestamp. |
| `archived_at` | TEXT | Nullable UTC ISO-8601 timestamp. |

Indexes: `(archived_at, sort_order)`, `collection_type_id`.

### 3.4 `categories`

Categories are global/reusable across collections in V1.

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `key` | TEXT | Stable key for built-in categories; nullable/generated for custom. |
| `name` | TEXT | Required for custom categories; system category display names use translation keys. |
| `icon` | TEXT | Icon identifier. |
| `color` | TEXT | Optional validated hex color. |
| `template_key` | TEXT | One of `NOTE`, `TASK`, `WISHLIST`, `EVENT`, `PREFERENCE`. |
| `is_system` | INTEGER | Boolean. |
| `is_active` | INTEGER | Boolean; inactive categories are hidden from new-entry selection but remain on existing entries. |
| `sort_order` | INTEGER | UI ordering. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |
| `updated_at` | TEXT | UTC ISO-8601 timestamp. |

Built-in categories and template mapping:

| Category key | Template |
|---|---|
| `WISHLIST` | `WISHLIST` |
| `EXPERIENCES` | `EVENT` |
| `PREFERENCES` | `PREFERENCE` |
| `HOME_IMPROVEMENTS` | `TASK` |
| `TASKS_REPAIRS` | `TASK` |
| `IMPORTANT_DATES` | `EVENT` |
| `GENERAL_NOTES` | `NOTE` |

### 3.5 `entries`

The primary information record.

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `collection_id` | TEXT | Nullable FK to `collections.id`; null only for Inbox. |
| `category_id` | TEXT | Nullable FK to `categories.id`; null only for Inbox. |
| `title` | TEXT | Required, trimmed, non-empty. |
| `description` | TEXT | Nullable. |
| `status` | TEXT | Nullable; validated against category template. NULL for NOTE/PREFERENCE templates and Inbox entries. Required-ness and defaults for status-bearing templates are pending O-021. |
| `priority` | TEXT | Nullable; `LOW`, `MEDIUM`, `HIGH`. |
| `date_start` | TEXT | Nullable ISO `YYYY-MM-DD`; semantics are template-specific (due/event/target date). |
| `date_end` | TEXT | Nullable ISO `YYYY-MM-DD`; for ranges where applicable; must not precede `date_start`. |
| `starts_at_utc` | TEXT | Nullable UTC ISO-8601 timestamp for timed events. |
| `ends_at_utc` | TEXT | Nullable UTC ISO-8601 timestamp; must not precede start. |
| `price_minor` | INTEGER | Nullable non-negative minor units; avoid floating point. |
| `currency_code` | TEXT | Nullable ISO 4217 code; required when price is set. |
| `location_text` | TEXT | Nullable user-entered location/address. No device coordinates required in V1. |
| `is_pinned` | INTEGER | Boolean, default false. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |
| `updated_at` | TEXT | UTC ISO-8601 timestamp. |
| `archived_at` | TEXT | Nullable UTC ISO-8601 timestamp. |
| `completed_at` | TEXT | Nullable UTC ISO-8601 timestamp; set/cleared consistently with status. |

**Inbox invariant:** `collection_id` and `category_id` must either both be NULL (Inbox) or both be NOT NULL (assigned). Enforce with a CHECK constraint:

```sql
CHECK (
  (collection_id IS NULL AND category_id IS NULL)
  OR
  (collection_id IS NOT NULL AND category_id IS NOT NULL)
)
```

Application/domain validation must also confirm that referenced collection/category are active where appropriate and that status is valid for the category's `template_key`.

Indexes:
- `(collection_id, category_id, archived_at, updated_at)`
- `(archived_at, is_pinned, updated_at)`
- `(status, priority)`
- `date_start`, `starts_at_utc`
- full-text index over title/description if FTS5 is enabled and verified.

### 3.6 `entry_links`

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `entry_id` | TEXT | Required FK to entries, cascade on delete. |
| `title` | TEXT | Optional display label. |
| `url` | TEXT | Required validated URL. |
| `sort_order` | INTEGER | User-defined order. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |

Validate allowed URL schemes (`https`, `http`; add others only with a product need). Never render arbitrary HTML from link metadata.

### 3.7 `entry_attachments`

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `entry_id` | TEXT | Required FK to entries, cascade on delete. |
| `relative_path` | TEXT | Required generated path relative to app-private media directory. |
| `mime_type` | TEXT | Required validated MIME type. |
| `file_size_bytes` | INTEGER | Required non-negative integer. |
| `width` | INTEGER | Nullable image width. |
| `height` | INTEGER | Nullable image height. |
| `content_hash` | TEXT | Optional integrity hash. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |

Do not store arbitrary user-supplied filesystem paths. Attachment bytes are outside SQLite and need their own protection and backup strategy.

### 3.8 `tags`

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `normalized_name` | TEXT | Required normalized unique value. |
| `display_name` | TEXT | Required user-facing label. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |

Unique index on `normalized_name`.

### 3.9 `entry_tags`

| Column | Type | Rules / meaning |
|---|---|---|
| `entry_id` | TEXT | FK to entries, cascade on delete. |
| `tag_id` | TEXT | FK to tags, cascade on delete. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |

Composite primary key: `(entry_id, tag_id)`. Remove unused tags or retain them according to a documented cleanup policy.

### 3.10 `reminders`

| Column | Type | Rules / meaning |
|---|---|---|
| `id` | TEXT | Primary key, UUID. |
| `entry_id` | TEXT | Required FK to entries, cascade on delete. |
| `scheduled_at_utc` | TEXT | Required UTC ISO-8601 instant. |
| `time_zone_id` | TEXT | IANA timezone ID used when user created the reminder. |
| `notification_id` | TEXT | Nullable OS scheduled-notification identifier. |
| `is_enabled` | INTEGER | Boolean. |
| `created_at` | TEXT | UTC ISO-8601 timestamp. |
| `updated_at` | TEXT | UTC ISO-8601 timestamp. |

The database is the source of truth. The OS notification schedule is a derived side effect that can be reconciled.

## 4. Example DDL constraints

Illustrative SQLite DDL for key invariants; actual migration files should include all columns, indexes, FK actions, and tested defaults.

```sql
CREATE TABLE entries (
  id TEXT PRIMARY KEY NOT NULL,
  collection_id TEXT NULL REFERENCES collections(id) ON DELETE CASCADE,
  category_id TEXT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NULL,
  status TEXT NULL,
  priority TEXT NULL CHECK (priority IS NULL OR priority IN ('LOW', 'MEDIUM', 'HIGH')),
  date_start TEXT NULL,
  date_end TEXT NULL,
  starts_at_utc TEXT NULL,
  ends_at_utc TEXT NULL,
  price_minor INTEGER NULL CHECK (price_minor IS NULL OR price_minor >= 0),
  currency_code TEXT NULL,
  location_text TEXT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NULL,
  completed_at TEXT NULL,
  CHECK (
    (collection_id IS NULL AND category_id IS NULL)
    OR
    (collection_id IS NOT NULL AND category_id IS NOT NULL)
  ),
  CHECK ((price_minor IS NULL AND currency_code IS NULL)
      OR (price_minor IS NOT NULL AND currency_code IS NOT NULL)),
  CHECK (date_end IS NULL OR date_start IS NOT NULL),
  CHECK (date_end IS NULL OR date_end >= date_start)
);
```

## 5. Seed data

Seed built-in collection types and categories using deterministic IDs or stable keys. Seeding must be idempotent and migration-safe. User-created types/categories must never be overwritten by a seed update.

**Confirmed decision O-020:** every built-in row has a **permanent ID** from a reserved built-in namespace as well as its unique `key`. Backups and collection imports from another device reference built-in rows directly by ID. User-created types and categories use random v4 UUIDs, and no user-created or imported custom row may use an ID inside the reserved namespace.

**Format (Confirmed O-038):** RFC 9562 version-8 UUIDs with prefix `4d454d30` ("MEM0"), for example `4d454d30-0000-8000-8000-000000000001` (collection type) and `4d454d30-0000-8000-8001-000000000001` (category). A v4 UUID cannot fall in this namespace because its version digit is 4.

System category display names must be localized from translation resources, not persisted as translated database values. Custom category names are user data and remain unchanged when language changes.

## 6. Deletion and lifecycle rules

- Archiving is reversible and does not remove data.
- Permanent entry deletion removes links, attachment metadata, tag associations, and reminders; remove associated files and cancel scheduled notifications.
- Permanent collection deletion requires confirmation and deletes its assigned entries and associated data. Inbox entries are unaffected.
- System collection types/categories cannot be deleted.
- Custom types/categories in use must be archived or reassigned before deletion.
- Remove orphaned tags according to a tested cleanup policy.
- Do not silently delete attachment files before the database transaction outcome is known; use staged cleanup where needed.
- `ON DELETE CASCADE` removes child **rows** only. It cannot delete attachment files or cancel OS notifications. Before deleting an entry or a collection, the application service must collect the affected attachment paths and notification identifiers. After the transaction commits, it removes those files and cancels those notifications. Orphan cleanup is the safety net.
- Archive semantics across collections, entries, categories, and types, and the single "archive" mechanism, are pending decision O-025.

## 7. Date and money conventions

### Dates

- All-day dates use `YYYY-MM-DD` strings and must not be converted to midnight UTC.
- Instants (timed events and reminders) use UTC ISO-8601 timestamps.
- Persist the relevant timezone ID for reminders where needed to explain/reconcile local scheduling.
- Convert to device locale/timezone only for display.

### Money

- Store `price_minor` as an integer number of minor currency units.
- Store currency as uppercase ISO 4217 code.
- Format for display using locale-aware formatting.
- Do not assume TRY for all users; a user preference may set a default currency.

## 8. Migration policy

- Keep migrations ordered and immutable after release.
- Each migration has a monotonic version and a clear purpose.
- Apply migrations transactionally where SQLite allows.
- Test from a fresh database and from every supported prior schema version.
- Backups carry a separate export-format version; database schema version and backup format version are not interchangeable.
- A migration must preserve user-created content and system seed integrity.
- Test SQLCipher behavior during migration on actual custom native builds.
- **Table rebuilds must not cascade-delete data.** SQLite cannot alter `CHECK` constraints or foreign keys in place, so such changes need a table rebuild. `PRAGMA foreign_keys` has no effect inside a transaction. With foreign keys enforced, `DROP TABLE entries` performs an implicit delete that fires `ON DELETE CASCADE` on links, attachments, tag links, and reminders. Follow SQLite's documented procedure for generalized `ALTER TABLE` changes:
  1. Turn foreign keys off **outside** the transaction.
  2. Inside the transaction: create the new table, copy the rows, drop the old table, rename the new one, and recreate indexes and triggers.
  3. Run `PRAGMA foreign_key_check` before committing.
  4. Turn foreign keys back on.

  Every rebuild migration needs a test proving that child rows survive.
- Data access uses hand-written, numbered migrations applied in order and tracked with `PRAGMA user_version`, each in its own transaction (Confirmed O-016). Each migration is a TypeScript module `src/database/migrations/NNNN-name.ts` whose `sql` field is a plain SQL script; modules (not `.sql` files) let Metro and Jest load them without custom transformers. The runner refuses a database whose version is newer than the app and never modifies it. Code: `src/database/` (Phase 1 slice 5a); the Phase 0 prototype is in `experiments/phase-0/node-harness/` (`PHASE_0_REPORT.md` §4.1).
- A migration is "released", and therefore frozen, once any build containing it has stored data the owner wants to keep, including the owner's long-lived test installs (Confirmed O-040).

## 9. Backup inclusion matrix

| Data | Full backup | Collection export |
|---|---|---|
| Collection metadata | All | Selected collection |
| Custom collection type | All used types | Required type definition |
| Custom categories | All | Categories used by selected entries |
| Entries | All, including Inbox | Selected collection entries |
| Links | All | Selected entries |
| Attachments | All | Selected entries |
| Tags | All used | Tags used by selected entries |
| Reminders | All enabled/defined | Selected entries' reminders |
| App settings | Selected portability-safe preferences only | No |
| Encryption keys/app-lock secrets | Never | Never |

## 10. Data model diagram

See [`diagrams/data-model.mmd`](./diagrams/data-model.mmd).
