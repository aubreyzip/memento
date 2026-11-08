import type { SqlDatabase } from '../connection/sql-database';

import type { Migration } from './migration';

export class DatabaseNewerThanAppError extends Error {
  constructor(
    readonly databaseVersion: number,
    readonly appVersion: number,
  ) {
    super(`Database schema version ${databaseVersion} is newer than this app (${appVersion})`);
    this.name = 'DatabaseNewerThanAppError';
  }
}

function assertSequential(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(`Migration versions must be 1..n in order; found ${migration.version}`);
    }
  });
}

/**
 * Applies pending migrations in order (O-016). Each migration and its `PRAGMA user_version`
 * update run in one transaction, so a failure leaves the previous version intact.
 * A database newer than the app is never modified (data written by a newer app version).
 *
 * Table-rebuild migrations need foreign keys switched off outside the transaction
 * (DATABASE_DESIGN §8); support for that is added with the first such migration.
 */
export async function runMigrations(
  db: SqlDatabase,
  migrations: readonly Migration[],
): Promise<{ from: number; to: number }> {
  assertSequential(migrations);
  const latest = migrations.length;
  const from = (await db.get<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;

  if (from > latest) {
    throw new DatabaseNewerThanAppError(from, latest);
  }

  for (const migration of migrations.slice(from)) {
    await db.transaction(async () => {
      await db.exec(migration.sql);
      // Integer from our own migration list, not user input.
      await db.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return { from, to: latest };
}
