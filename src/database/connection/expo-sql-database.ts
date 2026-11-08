import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { ClosableSqlDatabase, SqlValue } from './sql-database';

export const DATABASE_NAME = 'memento.db';

/** Adapts an expo-sqlite connection to SqlDatabase. Exported for unit tests of the mapping. */
export function wrapExpoDatabase(db: SQLiteDatabase): ClosableSqlDatabase {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: readonly SqlValue[] = []) => {
      const result = await db.runAsync(sql, [...params]);
      return { changes: result.changes };
    },
    all: <T>(sql: string, params: readonly SqlValue[] = []) => db.getAllAsync<T>(sql, [...params]),
    get: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      (await db.getFirstAsync<T>(sql, [...params])) ?? undefined,
    // Same keyed connection; never withExclusiveTransactionAsync (separate, unkeyed connection).
    transaction: async <T>(task: () => Promise<T>) => {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await task();
      });
      return result;
    },
    close: () => db.closeAsync(),
  };
}

/** Opens (or creates) the app database in expo-sqlite's default directory. Not yet keyed. */
export async function openExpoDatabase(): Promise<ClosableSqlDatabase> {
  return wrapExpoDatabase(await openDatabaseAsync(DATABASE_NAME));
}
