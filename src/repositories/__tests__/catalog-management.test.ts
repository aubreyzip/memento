import { randomUUID } from 'node:crypto';

import { initializeSchema } from '@/database/initialize-schema';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '@/database/testing/node-sql-database';
import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';
import { DomainError } from '@/domain/errors';

import { SqliteCategoryRepository, SqliteCollectionTypeRepository } from '../catalog-repositories';
import { SqliteCollectionRepository } from '../collection-repository';
import type { RepositoryDeps } from '../repository-deps';

const NOW = '2026-11-15T10:00:00.000Z';
const PERSON = BUILT_IN_COLLECTION_TYPES[0].id;
const WISHLIST = BUILT_IN_CATEGORIES[0].id;

const rejectsWith = (promise: Promise<unknown>, code: DomainError['code']) =>
  expect(promise).rejects.toEqual(expect.objectContaining({ name: 'DomainError', code }));

describe('catalog management (FR-012, FR-015, FR-021, FR-025, FR-027)', () => {
  let db: NodeSqlDatabase;
  let deps: RepositoryDeps;
  let types: SqliteCollectionTypeRepository;
  let categories: SqliteCategoryRepository;
  let collections: SqliteCollectionRepository;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await initializeSchema(db, { now: () => NOW });
    deps = { now: () => NOW, newId: randomUUID };
    types = new SqliteCollectionTypeRepository(db, deps);
    categories = new SqliteCategoryRepository(db, deps);
    collections = new SqliteCollectionRepository(db, deps);
  });
  afterEach(() => db.close());

  const addEntry = (collectionId: string, categoryId: string) =>
    db.run(
      `INSERT INTO entries (id, collection_id, category_id, title, created_at, updated_at)
       VALUES (?, ?, ?, 'Synthetic entry', ?, ?)`,
      [randomUUID(), collectionId, categoryId, NOW, NOW],
    );

  describe('collection types', () => {
    it('creates a custom type after the built-ins, with trimmed name and uppercase color', async () => {
      const type = await types.create({
        name: '  Pets  ',
        icon: 'paw-outline',
        accentColor: '#fb6376',
      });

      expect(type).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        key: null,
        name: 'Pets',
        icon: 'paw-outline',
        accentColor: '#FB6376',
        isSystem: false,
        sortOrder: 6,
        archivedAt: null,
      });
      expect((await types.listAll()).at(-1)).toEqual(type);
    });

    it('validates names, icons, and colors', async () => {
      await rejectsWith(types.create({ name: '   ' }), 'name-required');
      await rejectsWith(types.create({ name: 'x'.repeat(61) }), 'name-too-long');
      await expect(types.create({ name: '🐾'.repeat(60) })).resolves.toBeDefined();
      await rejectsWith(types.create({ name: 'Pets', accentColor: 'red' }), 'invalid-color');
      await rejectsWith(types.create({ name: 'Pets', icon: 'Paw Outline' }), 'invalid-icon');
    });

    it('refuses an ID generator that does not return v4 UUIDs (O-020)', async () => {
      const bad = new SqliteCollectionTypeRepository(db, {
        now: () => NOW,
        newId: () => '4d454d30-0000-8000-8000-0000000000ff',
      });
      await expect(bad.create({ name: 'Pets' })).rejects.toThrow(/v4 UUID/);
    });

    it('lets built-ins get an icon and color but not a new name (O-041)', async () => {
      const updated = await types.update(PERSON, { icon: 'person-outline', accentColor: null });
      expect(updated).toMatchObject({ key: 'PERSON', name: null, icon: 'person-outline' });

      await rejectsWith(types.update(PERSON, { name: 'People' }), 'built-in');
    });

    it('renames a custom type', async () => {
      const type = await types.create({ name: 'Pets' });
      await expect(types.update(type.id, { name: 'Animals' })).resolves.toMatchObject({
        name: 'Animals',
      });
    });

    it('archives and restores, built-ins included', async () => {
      await types.setArchived(PERSON, true);
      expect((await types.get(PERSON))!.archivedAt).toBe(NOW);
      await types.setArchived(PERSON, false);
      expect((await types.get(PERSON))!.archivedAt).toBeNull();
    });

    it('reorders and keeps unlisted rows in place', async () => {
      const [person, space, project, event, general] = BUILT_IN_COLLECTION_TYPES.map((t) => t.id);
      await types.reorder([project, person]);

      expect((await types.listAll()).map((t) => t.id)).toEqual([
        project,
        space,
        person,
        event,
        general,
      ]);
      await rejectsWith(types.reorder([person, person]), 'invalid-order');
      await rejectsWith(types.reorder([randomUUID()]), 'not-found');
    });

    it('deletes only unused custom types (FR-015, O-014)', async () => {
      await rejectsWith(types.delete(PERSON), 'built-in');

      const type = await types.create({ name: 'Pets' });
      const collection = await collections.create({ typeId: type.id, name: 'Synthetic pet' });
      await collections.setArchived(collection.id, true);
      expect(await types.usageCount(type.id)).toBe(1);
      await rejectsWith(types.delete(type.id), 'in-use');

      await collections.delete(collection.id);
      await types.delete(type.id);
      expect(await types.get(type.id)).toBeUndefined();
      await rejectsWith(types.delete(type.id), 'not-found');
    });
  });

  describe('categories', () => {
    it('creates a custom category with one of the five templates (FR-021, FR-022)', async () => {
      const category = await categories.create({ name: 'Books', templateKey: 'WISHLIST' });
      expect(category).toMatchObject({
        name: 'Books',
        templateKey: 'WISHLIST',
        isSystem: false,
        sortOrder: 8,
        archivedAt: null,
      });

      await rejectsWith(
        categories.create({ name: 'Bad', templateKey: 'FORM' as never }),
        'invalid-template',
      );
    });

    it('does not rename built-ins but allows icon and color', async () => {
      await rejectsWith(categories.update(WISHLIST, { name: 'Wants' }), 'built-in');
      await expect(categories.update(WISHLIST, { color: '#5d2a42' })).resolves.toMatchObject({
        color: '#5D2A42',
        templateKey: 'WISHLIST',
      });
    });

    it('deletes only unused custom categories (FR-025, O-006)', async () => {
      await rejectsWith(categories.delete(WISHLIST), 'built-in');

      const category = await categories.create({ name: 'Books', templateKey: 'NOTE' });
      const collection = await collections.create({ typeId: PERSON, name: 'Synthetic person' });
      await addEntry(collection.id, category.id);
      await rejectsWith(categories.delete(category.id), 'in-use');

      await categories.setArchived(category.id, true);
      expect((await categories.get(category.id))!.archivedAt).toBe(NOW);
    });
  });

  describe('collections', () => {
    it('creates, lists, and edits a collection (FR-010, FR-013)', async () => {
      const first = await collections.create({ typeId: PERSON, name: ' Synthetic A ' });
      const second = await collections.create({
        typeId: PERSON,
        name: 'Synthetic B',
        description: '   ',
        accentColorOverride: '#fcb1a6',
      });

      expect(first).toMatchObject({ name: 'Synthetic A', description: null, sortOrder: 1 });
      expect(second).toMatchObject({ sortOrder: 2, accentColorOverride: '#FCB1A6' });
      expect((await collections.list({ archived: false })).map((c) => c.id)).toEqual([
        first.id,
        second.id,
      ]);

      const space = BUILT_IN_COLLECTION_TYPES[1].id;
      const edited = await collections.update(first.id, {
        typeId: space,
        description: 'Synthetic description',
      });
      expect(edited).toMatchObject({
        typeId: space,
        name: 'Synthetic A',
        description: 'Synthetic description',
      });
    });

    it('limits the description to 10,000 characters (O-027)', async () => {
      await rejectsWith(
        collections.create({ typeId: PERSON, name: 'Synthetic', description: 'x'.repeat(10_001) }),
        'description-too-long',
      );
    });

    it('needs an existing, active type, but keeps an archived type it already has', async () => {
      await rejectsWith(collections.create({ typeId: randomUUID(), name: 'X' }), 'not-found');

      const collection = await collections.create({ typeId: PERSON, name: 'Synthetic' });
      await types.setArchived(PERSON, true);
      await rejectsWith(collections.create({ typeId: PERSON, name: 'Other' }), 'archived');
      await expect(collections.update(collection.id, { name: 'Renamed' })).resolves.toMatchObject({
        typeId: PERSON,
        name: 'Renamed',
      });

      const general = BUILT_IN_COLLECTION_TYPES[4].id;
      await types.setArchived(general, true);
      await rejectsWith(collections.update(collection.id, { typeId: general }), 'archived');
    });

    it('archives and restores, moving between the lists (O-025)', async () => {
      const collection = await collections.create({ typeId: PERSON, name: 'Synthetic' });
      await collections.setArchived(collection.id, true);

      expect(await collections.list({ archived: false })).toEqual([]);
      expect(await collections.list({ archived: true })).toEqual([
        expect.objectContaining({ id: collection.id, archivedAt: NOW }),
      ]);

      await collections.setArchived(collection.id, false);
      expect((await collections.list({ archived: false })).map((c) => c.id)).toEqual([
        collection.id,
      ]);
    });

    it('deletes a collection with its entries but leaves Inbox entries (FR-016)', async () => {
      const collection = await collections.create({ typeId: PERSON, name: 'Synthetic' });
      await addEntry(collection.id, WISHLIST);
      await addEntry(collection.id, WISHLIST);
      await db.run(
        `INSERT INTO entries (id, title, created_at, updated_at)
         VALUES (?, 'Synthetic inbox entry', ?, ?)`,
        [randomUUID(), NOW, NOW],
      );
      expect(await collections.entryCount(collection.id)).toBe(2);

      await collections.delete(collection.id);

      expect(await collections.get(collection.id)).toBeUndefined();
      const left = await db.all<{ collection_id: string | null }>(
        'SELECT collection_id FROM entries',
      );
      expect(left).toEqual([{ collection_id: null }]);
    });
  });
});
