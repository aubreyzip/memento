import { randomUUID } from 'node:crypto';

import { BUILT_IN_CATEGORIES } from '@/domain/catalog';

import { initializeSchema } from '../initialize-schema';
import { seedBuiltIns } from '../seeds/seed-built-ins';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '../testing/node-sql-database';

const NOW = '2026-11-08T12:00:00.000Z';

describe('built-in seeds (FR-011, FR-020, FR-026)', () => {
  let db: NodeSqlDatabase;
  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await initializeSchema(db, { now: () => NOW });
  });
  afterEach(() => db.close());

  it('seeds the five built-in collection types in order', async () => {
    const rows = await db.all<{ key: string }>(
      'SELECT key FROM collection_types WHERE is_system = 1 ORDER BY sort_order',
    );
    expect(rows.map((row) => row.key)).toEqual(['PERSON', 'SPACE', 'PROJECT', 'EVENT', 'GENERAL']);
  });

  it('seeds the seven built-in categories with the documented templates', async () => {
    const rows = await db.all<{ key: string; template_key: string }>(
      'SELECT key, template_key FROM categories WHERE is_system = 1 ORDER BY sort_order',
    );
    expect(rows).toEqual([
      { key: 'WISHLIST', template_key: 'WISHLIST' },
      { key: 'EXPERIENCES', template_key: 'EVENT' },
      { key: 'PREFERENCES', template_key: 'PREFERENCE' },
      { key: 'HOME_IMPROVEMENTS', template_key: 'TASK' },
      { key: 'TASKS_REPAIRS', template_key: 'TASK' },
      { key: 'IMPORTANT_DATES', template_key: 'EVENT' },
      { key: 'GENERAL_NOTES', template_key: 'NOTE' },
    ]);
  });

  it('stores no display names for built-ins (localized at display time)', async () => {
    const named = await db.get<{ n: number }>(
      `SELECT (SELECT count(*) FROM collection_types WHERE is_system = 1 AND name IS NOT NULL)
            + (SELECT count(*) FROM categories WHERE is_system = 1 AND name IS NOT NULL) AS n`,
    );
    expect(named!.n).toBe(0);
  });

  it('is idempotent across restarts', async () => {
    await seedBuiltIns(db, NOW);
    await initializeSchema(db, { now: () => NOW });
    expect((await db.get<{ n: number }>('SELECT count(*) AS n FROM collection_types'))!.n).toBe(5);
    expect((await db.get<{ n: number }>('SELECT count(*) AS n FROM categories'))!.n).toBe(7);
  });

  it('never overwrites existing rows, including customized built-ins and custom rows', async () => {
    const wishlist = BUILT_IN_CATEGORIES[0].id;
    const customId = randomUUID();
    await db.run('UPDATE categories SET sort_order = 42 WHERE id = ?', [wishlist]);
    await db.run(
      `INSERT INTO categories (id, name, template_key, created_at, updated_at)
       VALUES (?, 'My custom', 'NOTE', ?, ?)`,
      [customId, NOW, NOW],
    );

    await seedBuiltIns(db, '2030-01-01T00:00:00.000Z');

    expect(
      (await db.get<{ sort_order: number }>('SELECT sort_order FROM categories WHERE id = ?', [
        wishlist,
      ]))!.sort_order,
    ).toBe(42);
    expect(
      (await db.get<{ name: string }>('SELECT name FROM categories WHERE id = ?', [customId]))!
        .name,
    ).toBe('My custom');
  });

  it('restores a missing built-in row', async () => {
    await db.run("DELETE FROM collection_types WHERE key = 'GENERAL'");
    await seedBuiltIns(db, NOW);
    expect(
      (await db.get<{ n: number }>(
        "SELECT count(*) AS n FROM collection_types WHERE key = 'GENERAL'",
      ))!.n,
    ).toBe(1);
  });
});
