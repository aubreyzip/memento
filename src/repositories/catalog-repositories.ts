import type { SqlDatabase } from '@/database/connection/sql-database';
import type { Category, CollectionType, TemplateKey } from '@/domain/catalog';

/** Read access to collection types. Create/update/archive arrive in Phase 2. */
export interface CollectionTypeRepository {
  listAll(): Promise<CollectionType[]>;
}

/** Read access to categories. Create/update/archive arrive in Phase 2. */
export interface CategoryRepository {
  listAll(): Promise<Category[]>;
}

type CollectionTypeRow = {
  id: string;
  key: string | null;
  name: string | null;
  is_system: number;
  sort_order: number;
};

type CategoryRow = CollectionTypeRow & { template_key: TemplateKey };

export class SqliteCollectionTypeRepository implements CollectionTypeRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listAll(): Promise<CollectionType[]> {
    const rows = await this.db.all<CollectionTypeRow>(
      'SELECT id, key, name, is_system, sort_order FROM collection_types ORDER BY sort_order, id',
    );
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      isSystem: row.is_system === 1,
      sortOrder: row.sort_order,
    }));
  }
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listAll(): Promise<Category[]> {
    const rows = await this.db.all<CategoryRow>(
      `SELECT id, key, name, template_key, is_system, sort_order
       FROM categories ORDER BY sort_order, id`,
    );
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      templateKey: row.template_key,
      isSystem: row.is_system === 1,
      sortOrder: row.sort_order,
    }));
  }
}
