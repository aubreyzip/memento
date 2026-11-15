import type { SqlDatabase } from '@/database/connection/sql-database';
import { DomainError } from '@/domain/errors';
import { isUserId } from '@/domain/ids';

/** What writing repositories need besides the connection; injected so tests are deterministic. */
export type RepositoryDeps = {
  /** UTC ISO-8601 timestamp. */
  now: () => string;
  /** A random v4 UUID (on device: `expo-crypto` `randomUUID`). */
  newId: () => string;
};

/** Returns a fresh user ID, refusing anything that is not a v4 UUID (O-020). */
export function newUserId(deps: RepositoryDeps): string {
  const id = deps.newId();
  if (!isUserId(id)) throw new Error('newId must return a lowercase v4 UUID');
  return id;
}

/** Tables whose rows the user orders. Fixed names only: never interpolate input into SQL. */
export type OrderedTable = 'collection_types' | 'categories' | 'collections';

/** Next sort position: one past the current maximum. */
export async function nextSortOrder(db: SqlDatabase, table: OrderedTable): Promise<number> {
  const row = await db.get<{ n: number | null }>(`SELECT max(sort_order) AS n FROM ${table}`);
  return (row?.n ?? 0) + 1;
}

/**
 * Puts `ids` in the given order by reusing their current sort positions, so rows not listed
 * (archived ones, for example) keep their places. Runs in one transaction.
 */
export async function reorderRows(
  db: SqlDatabase,
  table: OrderedTable,
  ids: readonly string[],
  now: string,
): Promise<void> {
  if (new Set(ids).size !== ids.length) throw new DomainError('invalid-order', 'duplicate ids');
  await db.transaction(async () => {
    const slots: number[] = [];
    for (const id of ids) {
      const row = await db.get<{ sort_order: number }>(
        `SELECT sort_order FROM ${table} WHERE id = ?`,
        [id],
      );
      if (!row) throw new DomainError('not-found');
      slots.push(row.sort_order);
    }
    slots.sort((a, b) => a - b);
    // Equal slots (e.g. rows created with the default 0) would keep ties; spread them out.
    for (let i = 1; i < slots.length; i++) {
      if (slots[i] <= slots[i - 1]) slots[i] = slots[i - 1] + 1;
    }
    for (const [index, id] of ids.entries()) {
      await db.run(`UPDATE ${table} SET sort_order = ?, updated_at = ? WHERE id = ?`, [
        slots[index],
        now,
        id,
      ]);
    }
  });
}
