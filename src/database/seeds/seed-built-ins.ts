import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';

import type { SqlDatabase } from '../connection/sql-database';

/**
 * Inserts any missing built-in collection types and categories (FR-026). Idempotent and safe
 * to run at every startup: existing rows, built-in or custom, are never modified, so later
 * user customizations of built-ins (O-041) survive. Names are NULL: built-in display names come
 * from translation resources (DATABASE_DESIGN §5).
 */
export async function seedBuiltIns(db: SqlDatabase, now: string): Promise<void> {
  await db.transaction(async () => {
    for (const type of BUILT_IN_COLLECTION_TYPES) {
      await db.run(
        `INSERT INTO collection_types (id, key, name, icon, accent_color, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, NULL, 1, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [type.id, type.key, type.sortOrder, now, now],
      );
    }
    for (const category of BUILT_IN_CATEGORIES) {
      await db.run(
        `INSERT INTO categories (id, key, name, icon, color, template_key, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, NULL, ?, 1, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [category.id, category.key, category.templateKey, category.sortOrder, now, now],
      );
    }
  });
}
