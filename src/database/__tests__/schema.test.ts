import { randomUUID } from 'node:crypto';

import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';

import { initializeSchema } from '../initialize-schema';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '../testing/node-sql-database';

const NOW = '2026-11-08T12:00:00.000Z';
const PERSON = BUILT_IN_COLLECTION_TYPES[0].id;
const WISHLIST = BUILT_IN_CATEGORIES[0].id;

describe('core schema constraints', () => {
  let db: NodeSqlDatabase;

  const addCollection = (id = randomUUID(), typeId = PERSON, name = 'Synthetic person') =>
    db.run(
      `INSERT INTO collections (id, collection_type_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, typeId, name, NOW, NOW],
    );
  const addEntry = (
    collectionId: string | null,
    categoryId: string | null,
    title = 'Synthetic entry',
    id = randomUUID(),
  ) =>
    db.run(
      `INSERT INTO entries (id, collection_id, category_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, collectionId, categoryId, title, NOW, NOW],
    );
  const count = async (table: string) =>
    (await db.get<{ n: number }>(`SELECT count(*) AS n FROM ${table}`))!.n;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await initializeSchema(db, { now: () => NOW });
  });
  afterEach(() => db.close());

  describe('Inbox invariant (B-006)', () => {
    it('accepts unsorted and fully assigned entries', async () => {
      const collectionId = randomUUID();
      await addCollection(collectionId);
      await addEntry(null, null);
      await addEntry(collectionId, WISHLIST);
      expect(await count('entries')).toBe(2);
    });

    it('rejects half-assigned entries', async () => {
      const collectionId = randomUUID();
      await addCollection(collectionId);
      await expect(addEntry(collectionId, null)).rejects.toThrow(/CHECK/);
      await expect(addEntry(null, WISHLIST)).rejects.toThrow(/CHECK/);
    });
  });

  it('rejects blank titles and names', async () => {
    await expect(addEntry(null, null, '   ')).rejects.toThrow(/CHECK/);
    await expect(addCollection(randomUUID(), PERSON, ' ')).rejects.toThrow(/CHECK/);
  });

  it('cannot delete a collection type or category that is in use (RESTRICT)', async () => {
    const collectionId = randomUUID();
    await addCollection(collectionId);
    await addEntry(collectionId, WISHLIST);
    await expect(db.run('DELETE FROM collection_types WHERE id = ?', [PERSON])).rejects.toThrow(
      /FOREIGN KEY/,
    );
    await expect(db.run('DELETE FROM categories WHERE id = ?', [WISHLIST])).rejects.toThrow(
      /FOREIGN KEY/,
    );
  });

  it('deleting a collection deletes its entries (CASCADE) and leaves Inbox entries', async () => {
    const collectionId = randomUUID();
    await addCollection(collectionId);
    await addEntry(collectionId, WISHLIST);
    await addEntry(null, null);

    await db.run('DELETE FROM collections WHERE id = ?', [collectionId]);

    expect(await count('entries')).toBe(1);
  });

  describe('reserved built-in ID namespace (O-020, O-038)', () => {
    const reservedLike = '4d454d30-0000-8000-8000-0000000000ff';

    it('rejects user rows that use a reserved ID', async () => {
      await expect(addCollection(reservedLike)).rejects.toThrow(/CHECK/);
      await expect(addEntry(null, null, 'x', reservedLike)).rejects.toThrow(/CHECK/);
      await expect(
        db.run(
          `INSERT INTO categories (id, name, template_key, is_system, created_at, updated_at)
           VALUES (?, 'Custom', 'NOTE', 0, ?, ?)`,
          [reservedLike, NOW, NOW],
        ),
      ).rejects.toThrow(/CHECK/);
    });

    it('accepts a random v4 ID that merely shares the prefix', async () => {
      await addCollection('4d454d30-1234-4abc-8def-0123456789ab');
      expect(await count('collections')).toBe(1);
    });

    it('rejects a system row outside the namespace', async () => {
      await expect(
        db.run(
          `INSERT INTO collection_types (id, key, is_system, created_at, updated_at)
           VALUES (?, 'FAKE', 1, ?, ?)`,
          [randomUUID(), NOW, NOW],
        ),
      ).rejects.toThrow(/CHECK/);
    });
  });

  it('validates hex colors and template keys', async () => {
    await expect(
      db.run(
        `INSERT INTO collection_types (id, name, accent_color, created_at, updated_at)
         VALUES (?, 'Custom', 'red', ?, ?)`,
        [randomUUID(), NOW, NOW],
      ),
    ).rejects.toThrow(/CHECK/);
    await expect(
      db.run(
        `INSERT INTO categories (id, name, template_key, created_at, updated_at)
         VALUES (?, 'Custom', 'FORM', ?, ?)`,
        [randomUUID(), NOW, NOW],
      ),
    ).rejects.toThrow(/CHECK/);
    await db.run(
      `INSERT INTO collection_types (id, name, accent_color, created_at, updated_at)
       VALUES (?, 'Custom', '#5D2A42', ?, ?)`,
      [randomUUID(), NOW, NOW],
    );
  });

  it('a custom collection type needs a name', async () => {
    await expect(
      db.run(`INSERT INTO collection_types (id, created_at, updated_at) VALUES (?, ?, ?)`, [
        randomUUID(),
        NOW,
        NOW,
      ]),
    ).rejects.toThrow(/CHECK/);
  });
});
