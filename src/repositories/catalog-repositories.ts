import type { SqlDatabase } from '@/database/connection/sql-database';
import {
  isTemplateKey,
  validateColor,
  validateIcon,
  validateName,
  type Category,
  type CollectionType,
  type TemplateKey,
} from '@/domain/catalog';
import { DomainError } from '@/domain/errors';

import { newUserId, nextSortOrder, reorderRows, type RepositoryDeps } from './repository-deps';

export type CollectionTypeInput = {
  name: string;
  icon?: string | null;
  accentColor?: string | null;
};
export type CollectionTypeChanges = Partial<CollectionTypeInput>;

/**
 * Built-in and custom collection types (FR-011, FR-012, FR-015, O-014, O-041). Built-ins can be
 * reordered, archived, and given an icon or color, but not renamed or deleted. A type in use
 * cannot be deleted; it can be archived.
 */
export interface CollectionTypeRepository {
  /** All types, archived included, in display order. */
  listAll(): Promise<CollectionType[]>;
  get(id: string): Promise<CollectionType | undefined>;
  create(input: CollectionTypeInput): Promise<CollectionType>;
  update(id: string, changes: CollectionTypeChanges): Promise<CollectionType>;
  setArchived(id: string, archived: boolean): Promise<void>;
  reorder(ids: readonly string[]): Promise<void>;
  /** Number of collections (archived included) using the type. */
  usageCount(id: string): Promise<number>;
  delete(id: string): Promise<void>;
}

export type CategoryInput = {
  name: string;
  templateKey: TemplateKey;
  icon?: string | null;
  color?: string | null;
};
/**
 * The template is fixed at creation: changing it would change status rules for existing entries
 * (O-021), which the entry slice must handle first.
 */
export type CategoryChanges = Partial<Omit<CategoryInput, 'templateKey'>>;

/**
 * Built-in and custom categories, global across collections (FR-020–FR-027, O-005, O-006,
 * O-041). Built-ins cannot be renamed or deleted; a category in use cannot be deleted.
 */
export interface CategoryRepository {
  listAll(): Promise<Category[]>;
  get(id: string): Promise<Category | undefined>;
  create(input: CategoryInput): Promise<Category>;
  update(id: string, changes: CategoryChanges): Promise<Category>;
  setArchived(id: string, archived: boolean): Promise<void>;
  reorder(ids: readonly string[]): Promise<void>;
  /** Number of entries (archived included) using the category. */
  usageCount(id: string): Promise<number>;
  delete(id: string): Promise<void>;
}

type CollectionTypeRow = {
  id: string;
  key: string | null;
  name: string | null;
  icon: string | null;
  accent_color: string | null;
  is_system: number;
  sort_order: number;
  archived_at: string | null;
};

type CategoryRow = Omit<CollectionTypeRow, 'accent_color'> & {
  color: string | null;
  template_key: TemplateKey;
};

const toCollectionType = (row: CollectionTypeRow): CollectionType => ({
  id: row.id,
  key: row.key,
  name: row.name,
  icon: row.icon,
  accentColor: row.accent_color,
  isSystem: row.is_system === 1,
  sortOrder: row.sort_order,
  archivedAt: row.archived_at,
});

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  key: row.key,
  name: row.name,
  icon: row.icon,
  color: row.color,
  templateKey: row.template_key,
  isSystem: row.is_system === 1,
  sortOrder: row.sort_order,
  archivedAt: row.archived_at,
});

const defaultDeps: RepositoryDeps = {
  now: () => new Date().toISOString(),
  newId: () => {
    throw new Error('This repository was created read-only; pass deps to write.');
  },
};

const TYPE_COLUMNS = 'id, key, name, icon, accent_color, is_system, sort_order, archived_at';

export class SqliteCollectionTypeRepository implements CollectionTypeRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly deps: RepositoryDeps = defaultDeps,
  ) {}

  async listAll(): Promise<CollectionType[]> {
    const rows = await this.db.all<CollectionTypeRow>(
      `SELECT ${TYPE_COLUMNS} FROM collection_types ORDER BY sort_order, id`,
    );
    return rows.map(toCollectionType);
  }

  async get(id: string): Promise<CollectionType | undefined> {
    const row = await this.db.get<CollectionTypeRow>(
      `SELECT ${TYPE_COLUMNS} FROM collection_types WHERE id = ?`,
      [id],
    );
    return row && toCollectionType(row);
  }

  private async require(id: string): Promise<CollectionType> {
    const type = await this.get(id);
    if (!type) throw new DomainError('not-found');
    return type;
  }

  async create(input: CollectionTypeInput): Promise<CollectionType> {
    const name = validateName(input.name);
    const icon = validateIcon(input.icon);
    const accentColor = validateColor(input.accentColor);
    const id = newUserId(this.deps);
    const now = this.deps.now();
    await this.db.transaction(async () => {
      const sortOrder = await nextSortOrder(this.db, 'collection_types');
      await this.db.run(
        `INSERT INTO collection_types
           (id, key, name, icon, accent_color, is_system, sort_order, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, 0, ?, ?, ?)`,
        [id, name, icon, accentColor, sortOrder, now, now],
      );
    });
    return this.require(id);
  }

  async update(id: string, changes: CollectionTypeChanges): Promise<CollectionType> {
    const current = await this.require(id);
    if (changes.name !== undefined && current.isSystem) throw new DomainError('built-in');
    const name = changes.name === undefined ? current.name : validateName(changes.name);
    const icon = changes.icon === undefined ? current.icon : validateIcon(changes.icon);
    const accentColor =
      changes.accentColor === undefined ? current.accentColor : validateColor(changes.accentColor);
    await this.db.run(
      `UPDATE collection_types SET name = ?, icon = ?, accent_color = ?, updated_at = ?
       WHERE id = ?`,
      [name, icon, accentColor, this.deps.now(), id],
    );
    return this.require(id);
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.require(id);
    const now = this.deps.now();
    await this.db.run('UPDATE collection_types SET archived_at = ?, updated_at = ? WHERE id = ?', [
      archived ? now : null,
      now,
      id,
    ]);
  }

  reorder(ids: readonly string[]): Promise<void> {
    return reorderRows(this.db, 'collection_types', ids, this.deps.now());
  }

  async usageCount(id: string): Promise<number> {
    const row = await this.db.get<{ n: number }>(
      'SELECT count(*) AS n FROM collections WHERE collection_type_id = ?',
      [id],
    );
    return row?.n ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(async () => {
      const type = await this.require(id);
      if (type.isSystem) throw new DomainError('built-in');
      if ((await this.usageCount(id)) > 0) throw new DomainError('in-use');
      await this.db.run('DELETE FROM collection_types WHERE id = ?', [id]);
    });
  }
}

const CATEGORY_COLUMNS =
  'id, key, name, icon, color, template_key, is_system, sort_order, archived_at';

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly deps: RepositoryDeps = defaultDeps,
  ) {}

  async listAll(): Promise<Category[]> {
    const rows = await this.db.all<CategoryRow>(
      `SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY sort_order, id`,
    );
    return rows.map(toCategory);
  }

  async get(id: string): Promise<Category | undefined> {
    const row = await this.db.get<CategoryRow>(
      `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ?`,
      [id],
    );
    return row && toCategory(row);
  }

  private async require(id: string): Promise<Category> {
    const category = await this.get(id);
    if (!category) throw new DomainError('not-found');
    return category;
  }

  async create(input: CategoryInput): Promise<Category> {
    const name = validateName(input.name);
    if (!isTemplateKey(input.templateKey)) throw new DomainError('invalid-template');
    const icon = validateIcon(input.icon);
    const color = validateColor(input.color);
    const id = newUserId(this.deps);
    const now = this.deps.now();
    await this.db.transaction(async () => {
      const sortOrder = await nextSortOrder(this.db, 'categories');
      await this.db.run(
        `INSERT INTO categories
           (id, key, name, icon, color, template_key, is_system, sort_order, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [id, name, icon, color, input.templateKey, sortOrder, now, now],
      );
    });
    return this.require(id);
  }

  async update(id: string, changes: CategoryChanges): Promise<Category> {
    const current = await this.require(id);
    if (changes.name !== undefined && current.isSystem) throw new DomainError('built-in');
    const name = changes.name === undefined ? current.name : validateName(changes.name);
    const icon = changes.icon === undefined ? current.icon : validateIcon(changes.icon);
    const color = changes.color === undefined ? current.color : validateColor(changes.color);
    await this.db.run(
      'UPDATE categories SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
      [name, icon, color, this.deps.now(), id],
    );
    return this.require(id);
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.require(id);
    const now = this.deps.now();
    await this.db.run('UPDATE categories SET archived_at = ?, updated_at = ? WHERE id = ?', [
      archived ? now : null,
      now,
      id,
    ]);
  }

  reorder(ids: readonly string[]): Promise<void> {
    return reorderRows(this.db, 'categories', ids, this.deps.now());
  }

  async usageCount(id: string): Promise<number> {
    const row = await this.db.get<{ n: number }>(
      'SELECT count(*) AS n FROM entries WHERE category_id = ?',
      [id],
    );
    return row?.n ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(async () => {
      const category = await this.require(id);
      if (category.isSystem) throw new DomainError('built-in');
      if ((await this.usageCount(id)) > 0) throw new DomainError('in-use');
      await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
    });
  }
}
