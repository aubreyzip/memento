import type { SqlDatabase } from '@/database/connection/sql-database';
import {
  validateColor,
  validateDescription,
  validateIcon,
  validateName,
  type Collection,
} from '@/domain/catalog';
import { DomainError } from '@/domain/errors';

import { newUserId, nextSortOrder, reorderRows, type RepositoryDeps } from './repository-deps';

export type CollectionInput = {
  typeId: string;
  name: string;
  description?: string | null;
  iconOverride?: string | null;
  accentColorOverride?: string | null;
};
export type CollectionChanges = Partial<CollectionInput>;

/**
 * Collections (FR-010, FR-013, FR-014, FR-016, O-025). A collection needs an active type; an
 * archived type stays valid on collections that already use it.
 */
export interface CollectionRepository {
  /** Active collections, or archived ones, in display order. */
  list(filter: { archived: boolean }): Promise<Collection[]>;
  get(id: string): Promise<Collection | undefined>;
  create(input: CollectionInput): Promise<Collection>;
  update(id: string, changes: CollectionChanges): Promise<Collection>;
  setArchived(id: string, archived: boolean): Promise<void>;
  reorder(ids: readonly string[]): Promise<void>;
  /** Entries (archived included) that permanent deletion would remove, for FR-016. */
  entryCount(id: string): Promise<number>;
  /**
   * Permanently deletes the collection and its assigned entries; Inbox entries are unaffected
   * (DATABASE_DESIGN §6). When entries gain attachments and reminders, the caller must collect
   * their files and notification IDs first and clean them up after this commits.
   */
  delete(id: string): Promise<void>;
}

type CollectionRow = {
  id: string;
  collection_type_id: string;
  name: string;
  description: string | null;
  icon_override: string | null;
  accent_color_override: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

const COLUMNS = `id, collection_type_id, name, description, icon_override, accent_color_override,
  sort_order, created_at, updated_at, archived_at`;

const toCollection = (row: CollectionRow): Collection => ({
  id: row.id,
  typeId: row.collection_type_id,
  name: row.name,
  description: row.description,
  iconOverride: row.icon_override,
  accentColorOverride: row.accent_color_override,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export class SqliteCollectionRepository implements CollectionRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly deps: RepositoryDeps,
  ) {}

  async list({ archived }: { archived: boolean }): Promise<Collection[]> {
    const rows = await this.db.all<CollectionRow>(
      `SELECT ${COLUMNS} FROM collections
       WHERE (archived_at IS NOT NULL) = ?
       ORDER BY sort_order, id`,
      [archived ? 1 : 0],
    );
    return rows.map(toCollection);
  }

  async get(id: string): Promise<Collection | undefined> {
    const row = await this.db.get<CollectionRow>(
      `SELECT ${COLUMNS} FROM collections WHERE id = ?`,
      [id],
    );
    return row && toCollection(row);
  }

  private async require(id: string): Promise<Collection> {
    const collection = await this.get(id);
    if (!collection) throw new DomainError('not-found');
    return collection;
  }

  /** The type must exist and not be archived. */
  private async requireActiveType(typeId: string): Promise<void> {
    const type = await this.db.get<{ archived_at: string | null }>(
      'SELECT archived_at FROM collection_types WHERE id = ?',
      [typeId],
    );
    if (!type) throw new DomainError('not-found', 'collection type not found');
    if (type.archived_at !== null) throw new DomainError('archived');
  }

  async create(input: CollectionInput): Promise<Collection> {
    const name = validateName(input.name);
    const description = validateDescription(input.description);
    const icon = validateIcon(input.iconOverride);
    const color = validateColor(input.accentColorOverride);
    const id = newUserId(this.deps);
    const now = this.deps.now();
    await this.db.transaction(async () => {
      await this.requireActiveType(input.typeId);
      const sortOrder = await nextSortOrder(this.db, 'collections');
      await this.db.run(
        `INSERT INTO collections (id, collection_type_id, name, description, icon_override,
           accent_color_override, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.typeId, name, description, icon, color, sortOrder, now, now],
      );
    });
    return this.require(id);
  }

  async update(id: string, changes: CollectionChanges): Promise<Collection> {
    const current = await this.require(id);
    const name = changes.name === undefined ? current.name : validateName(changes.name);
    const description =
      changes.description === undefined
        ? current.description
        : validateDescription(changes.description);
    const icon =
      changes.iconOverride === undefined
        ? current.iconOverride
        : validateIcon(changes.iconOverride);
    const color =
      changes.accentColorOverride === undefined
        ? current.accentColorOverride
        : validateColor(changes.accentColorOverride);
    const typeId = changes.typeId ?? current.typeId;
    await this.db.transaction(async () => {
      if (typeId !== current.typeId) await this.requireActiveType(typeId);
      await this.db.run(
        `UPDATE collections SET collection_type_id = ?, name = ?, description = ?,
           icon_override = ?, accent_color_override = ?, updated_at = ?
         WHERE id = ?`,
        [typeId, name, description, icon, color, this.deps.now(), id],
      );
    });
    return this.require(id);
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.require(id);
    const now = this.deps.now();
    await this.db.run('UPDATE collections SET archived_at = ?, updated_at = ? WHERE id = ?', [
      archived ? now : null,
      now,
      id,
    ]);
  }

  reorder(ids: readonly string[]): Promise<void> {
    return reorderRows(this.db, 'collections', ids, this.deps.now());
  }

  async entryCount(id: string): Promise<number> {
    const row = await this.db.get<{ n: number }>(
      'SELECT count(*) AS n FROM entries WHERE collection_id = ?',
      [id],
    );
    return row?.n ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.require(id);
      // ON DELETE CASCADE removes the collection's entries (and later their child rows).
      await this.db.run('DELETE FROM collections WHERE id = ?', [id]);
    });
  }
}
