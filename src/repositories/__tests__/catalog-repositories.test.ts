import { randomUUID } from 'node:crypto';

import { initializeSchema } from '@/database/initialize-schema';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '@/database/testing/node-sql-database';
import { createI18n, translatorFor } from '@/localization/i18n';
import { categoryName, collectionTypeName } from '@/localization/catalog-names';

import { SqliteCategoryRepository, SqliteCollectionTypeRepository } from '../catalog-repositories';

describe('catalog repositories', () => {
  let db: NodeSqlDatabase;
  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await initializeSchema(db);
  });
  afterEach(() => db.close());

  const i18n = createI18n();

  it('lists built-in collection types with localized names', async () => {
    const types = await new SqliteCollectionTypeRepository(db).listAll();
    expect(types.map((type) => collectionTypeName(type, translatorFor(i18n, 'en')))).toEqual([
      'Person',
      'Space',
      'Project',
      'Event',
      'General',
    ]);
    expect(types.map((type) => collectionTypeName(type, translatorFor(i18n, 'tr')))).toEqual([
      'Kişi',
      'Alan',
      'Proje',
      'Etkinlik',
      'Genel',
    ]);
    expect(types.every((type) => type.isSystem)).toBe(true);
  });

  it('lists built-in categories with templates and localized names', async () => {
    const categories = await new SqliteCategoryRepository(db).listAll();
    expect(
      categories.map((category) => [
        categoryName(category, translatorFor(i18n, 'en')),
        category.templateKey,
      ]),
    ).toEqual([
      ['Wishlist', 'WISHLIST'],
      ['Experiences', 'EVENT'],
      ['Preferences', 'PREFERENCE'],
      ['Home & Improvements', 'TASK'],
      ['Tasks & Repairs', 'TASK'],
      ['Important Dates', 'EVENT'],
      ['General Notes', 'NOTE'],
    ]);
  });

  it('shows custom names exactly as entered in every language (FR-006)', async () => {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO categories (id, name, template_key, sort_order, created_at, updated_at)
       VALUES (?, 'Kitaplar / Books', 'NOTE', 100, ?, ?)`,
      [randomUUID(), now, now],
    );
    const custom = (await new SqliteCategoryRepository(db).listAll()).at(-1)!;

    expect(custom.isSystem).toBe(false);
    expect(categoryName(custom, translatorFor(i18n, 'en'))).toBe('Kitaplar / Books');
    expect(categoryName(custom, translatorFor(i18n, 'tr'))).toBe('Kitaplar / Books');
  });
});
