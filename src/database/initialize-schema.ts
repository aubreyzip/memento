import type { SqlDatabase } from './connection/sql-database';
import { MIGRATIONS } from './migrations';
import type { Migration } from './migrations/migration';
import { runMigrations } from './migrations/run-migrations';
import { seedBuiltIns } from './seeds/seed-built-ins';

/**
 * Brings an opened, keyed, configured database up to date: migrations, then built-in seeds
 * (SDD §8.1 steps 6–7). Keying and the SQLCipher check happen before this (slice 5b).
 */
export async function initializeSchema(
  db: SqlDatabase,
  options: { now?: () => string; migrations?: readonly Migration[] } = {},
): Promise<{ from: number; to: number }> {
  const now = options.now ?? (() => new Date().toISOString());
  const result = await runMigrations(db, options.migrations ?? MIGRATIONS);
  await seedBuiltIns(db, now());
  return result;
}
