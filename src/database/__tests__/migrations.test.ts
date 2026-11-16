import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';

import { initializeSchema } from '../initialize-schema';
import { MIGRATIONS } from '../migrations';
import type { Migration } from '../migrations/migration';
import { DatabaseNewerThanAppError, runMigrations } from '../migrations/run-migrations';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '../testing/node-sql-database';

const LATEST = MIGRATIONS.length;

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
    await expect(runMigrations(db, MIGRATIONS)).resolves.toEqual({ from: 0, to: LATEST });
    expect(await version(db)).toBe(LATEST);
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
    await expect(runMigrations(db, MIGRATIONS)).resolves.toEqual({ from: LATEST, to: LATEST });
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const failing: Migration = {
      version: LATEST + 1,
      name: 'failing',
      sql: 'CREATE TABLE half_done (id TEXT); INSERT INTO missing_table VALUES (1);',
    };
    await runMigrations(db, MIGRATIONS);

    await expect(runMigrations(db, [...MIGRATIONS, failing])).rejects.toThrow();

    expect(await version(db)).toBe(LATEST);
    expect(await tables(db)).not.toContain('half_done');
  });

  it('refuses to touch a database written by a newer app version', async () => {
    await runMigrations(db, MIGRATIONS);
    await db.exec('PRAGMA user_version = 99');

    await expect(runMigrations(db, MIGRATIONS)).rejects.toBeInstanceOf(DatabaseNewerThanAppError);
    expect(await version(db)).toBe(99);
  });

  it('rejects a non-sequential migration list', async () => {
    const gap: Migration = { version: LATEST + 2, name: 'gap', sql: 'SELECT 1;' };
    await expect(runMigrations(db, [...MIGRATIONS, gap])).rejects.toThrow(/1\.\.n/);
    expect(await version(db)).toBe(0);
  });

  it('keeps foreign key enforcement on after migrating', async () => {
    await initializeSchema(db);
    expect((await db.get<{ foreign_keys: number }>('PRAGMA foreign_keys'))!.foreign_keys).toBe(1);
  });
});

describe('migration 0002 catalog lifecycle (O-025)', () => {
  it('upgrades a version 1 database and keeps its rows', async () => {
    const db = openNodeSqlDatabase();
    try {
      await initializeSchema(db, { migrations: MIGRATIONS.slice(0, 1) });
      const now = '2026-11-15T10:00:00.000Z';
      const customType = '6f1c1d36-5b0e-4a51-9a4e-0d6c2f6b1a01';
      await db.run(
        `INSERT INTO collection_types (id, name, sort_order, created_at, updated_at)
         VALUES (?, 'Synthetic type', 50, ?, ?)`,
        [customType, now, now],
      );
      await db.run(
        `INSERT INTO collections (id, collection_type_id, name, created_at, updated_at)
         VALUES ('6f1c1d36-5b0e-4a51-9a4e-0d6c2f6b1a02', ?, 'Synthetic collection', ?, ?)`,
        [customType, now, now],
      );

      await expect(initializeSchema(db)).resolves.toEqual({ from: 1, to: LATEST });

      const type = await db.get<{ name: string; archived_at: string | null }>(
        'SELECT name, archived_at FROM collection_types WHERE id = ?',
        [customType],
      );
      expect(type).toEqual({ name: 'Synthetic type', archived_at: null });
      const counts = await db.get<{ types: number; categories: number; collections: number }>(
        `SELECT (SELECT count(*) FROM collection_types) AS types,
                (SELECT count(*) FROM categories WHERE archived_at IS NULL) AS categories,
                (SELECT count(*) FROM collections) AS collections`,
      );
      expect(counts).toEqual({ types: 6, categories: 7, collections: 1 });
    } finally {
      db.close();
    }
  });
});

describe('migration 0003 entry fields (O-021 to O-026)', () => {
  const now = '2026-11-16T10:00:00.000Z';
  const collection = '6f1c1d36-5b0e-4a51-9a4e-0d6c2f6b1a03';
  const entry = '6f1c1d36-5b0e-4a51-9a4e-0d6c2f6b1a04';
  const generalType = BUILT_IN_COLLECTION_TYPES[4].id;
  const notes = BUILT_IN_CATEGORIES[6].id;

  it('upgrades a version 2 database and keeps its entries', async () => {
    const db = openNodeSqlDatabase();
    try {
      await initializeSchema(db, { migrations: MIGRATIONS.slice(0, 2) });
      await db.run(
        `INSERT INTO collections (id, collection_type_id, name, created_at, updated_at)
         VALUES (?, ?, 'Synthetic collection', ?, ?)`,
        [collection, generalType, now, now],
      );
      await db.run(
        `INSERT INTO entries (id, collection_id, category_id, title, created_at, updated_at)
         VALUES (?, ?, ?, 'Synthetic entry', ?, ?)`,
        [entry, collection, notes, now, now],
      );

      await expect(initializeSchema(db)).resolves.toEqual({ from: 2, to: LATEST });

      const row = await db.get(
        'SELECT title, status, date_recurrence, price_minor, search_text FROM entries WHERE id = ?',
        [entry],
      );
      expect(row).toEqual({
        title: 'Synthetic entry',
        status: null,
        date_recurrence: 'NONE',
        price_minor: null,
        search_text: '',
      });
    } finally {
      db.close();
    }
  });

  it('enforces the structural checks', async () => {
    const db = openNodeSqlDatabase();
    try {
      await initializeSchema(db);
      await db.run(
        `INSERT INTO collections (id, collection_type_id, name, created_at, updated_at)
         VALUES (?, ?, 'Synthetic collection', ?, ?)`,
        [collection, generalType, now, now],
      );
      const insert = (columns: string, values: (string | number)[]) =>
        db.run(
          `INSERT INTO entries (id, title, created_at, updated_at, ${columns})
           VALUES ('${entry}', 'X', '${now}', '${now}', ${values.map(() => '?').join(', ')})`,
          values,
        );

      await expect(insert('price_minor', [100])).rejects.toThrow(/CHECK/);
      await expect(insert('price_minor, currency_code', [-1, 'EUR'])).rejects.toThrow(/CHECK/);
      await expect(insert('price_minor, currency_code', [1.5, 'EUR'])).rejects.toThrow(/CHECK/);
      await expect(insert('price_minor, currency_code', [100, 'eur'])).rejects.toThrow(/CHECK/);
      await expect(insert('date_start', ['16.11.2026'])).rejects.toThrow(/CHECK/);
      await expect(insert('date_start, date_end', ['2026-11-16', '2026-11-15'])).rejects.toThrow(
        /CHECK/,
      );
      await insert('price_minor, currency_code, date_start, date_end', [
        100,
        'EUR',
        '2026-11-16',
        '2026-11-17',
      ]);
    } finally {
      db.close();
    }
  });
});
