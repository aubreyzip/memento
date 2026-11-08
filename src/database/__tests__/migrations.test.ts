import { initializeSchema } from '../initialize-schema';
import { MIGRATIONS } from '../migrations';
import type { Migration } from '../migrations/migration';
import { DatabaseNewerThanAppError, runMigrations } from '../migrations/run-migrations';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '../testing/node-sql-database';

const version = async (db: NodeSqlDatabase) =>
  (await db.get<{ user_version: number }>('PRAGMA user_version'))!.user_version;

const tables = async (db: NodeSqlDatabase) =>
  (
    await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((row) => row.name);

describe('runMigrations (O-016)', () => {
  let db: NodeSqlDatabase;
  beforeEach(() => {
    db = openNodeSqlDatabase();
  });
  afterEach(() => db.close());

  it('creates the core schema on a fresh database (O-043)', async () => {
    await expect(runMigrations(db, MIGRATIONS)).resolves.toEqual({ from: 0, to: 1 });
    expect(await version(db)).toBe(1);
    expect(await tables(db)).toEqual([
      'app_settings',
      'categories',
      'collection_types',
      'collections',
      'entries',
    ]);
  });

  it('is a no-op when already up to date', async () => {
    await runMigrations(db, MIGRATIONS);
    await expect(runMigrations(db, MIGRATIONS)).resolves.toEqual({ from: 1, to: 1 });
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const failing: Migration = {
      version: 2,
      name: 'failing',
      sql: 'CREATE TABLE half_done (id TEXT); INSERT INTO missing_table VALUES (1);',
    };
    await runMigrations(db, MIGRATIONS);

    await expect(runMigrations(db, [...MIGRATIONS, failing])).rejects.toThrow();

    expect(await version(db)).toBe(1);
    expect(await tables(db)).not.toContain('half_done');
  });

  it('refuses to touch a database written by a newer app version', async () => {
    await runMigrations(db, MIGRATIONS);
    await db.exec('PRAGMA user_version = 99');

    await expect(runMigrations(db, MIGRATIONS)).rejects.toBeInstanceOf(DatabaseNewerThanAppError);
    expect(await version(db)).toBe(99);
  });

  it('rejects a non-sequential migration list', async () => {
    const gap: Migration = { version: 3, name: 'gap', sql: 'SELECT 1;' };
    await expect(runMigrations(db, [...MIGRATIONS, gap])).rejects.toThrow(/1\.\.n/);
    expect(await version(db)).toBe(0);
  });

  it('keeps foreign key enforcement on after migrating', async () => {
    await initializeSchema(db);
    expect((await db.get<{ foreign_keys: number }>('PRAGMA foreign_keys'))!.foreign_keys).toBe(1);
  });
});
