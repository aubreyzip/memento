import type { SqlDatabase } from '@/database/connection/sql-database';
import { isTemplateKey, validateDescription, type TemplateKey } from '@/domain/catalog';
import {
  completedAtFor,
  isEntryStatus,
  isPriority,
  resolveStatus,
  validatePriority,
  validateTitle,
  type Entry,
} from '@/domain/entries';
import {
  placementColumns,
  placementFromColumns,
  type EntryPlacement,
} from '@/domain/entry-placement';
import { RECURRENCES, type Recurrence } from '@/domain/entry-templates';
import { DomainError } from '@/domain/errors';
import { entrySearchText } from '@/domain/search';

import { newUserId, type RepositoryDeps } from './repository-deps';

export type EntryInput = {
  placement: EntryPlacement;
  title: string;
  description?: string | null;
  /** Omit for the template's default (O-021). */
  status?: string | null;
  priority?: string | null;
};
export type EntryChanges = Partial<EntryInput>;

/**
 * Entries (FR-040 to FR-047, O-021 to O-025). Placement follows the Inbox rule (B-006); status
 * and `completed_at` follow the category's template (O-021). Values of fields the template
 * does not offer are kept, not cleared (O-022); only status is remapped.
 */
export interface EntryRepository {
  /** A collection's entries, pinned first, then most recently updated. */
  listInCollection(collectionId: string, filter: { archived: boolean }): Promise<Entry[]>;
  /** Unsorted Quick Capture entries (B-007), in the same order. */
  listInbox(filter: { archived: boolean }): Promise<Entry[]>;
  get(id: string): Promise<Entry | undefined>;
  create(input: EntryInput): Promise<Entry>;
  /** Edits fields and, with `placement`, moves the entry atomically (O-021 status rules). */
  update(id: string, changes: EntryChanges): Promise<Entry>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  /**
   * Permanently deletes the entry. When entries gain attachments and reminders, the caller must
   * collect their files and notification IDs first and clean them up after this commits.
   */
  delete(id: string): Promise<void>;
}

type EntryRow = {
  id: string;
  collection_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  date_start: string | null;
  date_end: string | null;
  starts_at_utc: string | null;
  ends_at_utc: string | null;
  date_recurrence: string;
  price_minor: number | null;
  currency_code: string | null;
  location_text: string | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  completed_at: string | null;
};

const COLUMNS = `id, collection_id, category_id, title, description, status, priority,
  date_start, date_end, starts_at_utc, ends_at_utc, date_recurrence, price_minor, currency_code,
  location_text, is_pinned, created_at, updated_at, archived_at, completed_at`;

const ORDER = 'ORDER BY is_pinned DESC, updated_at DESC, id';

const isRecurrence = (value: string): value is Recurrence =>
  (RECURRENCES as readonly string[]).includes(value);

/** Unknown codes (for example from a newer app version) read as empty rather than failing. */
const toEntry = (row: EntryRow): Entry => ({
  id: row.id,
  placement: placementFromColumns({
    collectionId: row.collection_id,
    categoryId: row.category_id,
  }),
  title: row.title,
  description: row.description,
  status: isEntryStatus(row.status) ? row.status : null,
  priority: isPriority(row.priority) ? row.priority : null,
  dateStart: row.date_start,
  dateEnd: row.date_end,
  startsAtUtc: row.starts_at_utc,
  endsAtUtc: row.ends_at_utc,
  recurrence: isRecurrence(row.date_recurrence) ? row.date_recurrence : 'NONE',
  priceMinor: row.price_minor,
  currencyCode: row.currency_code,
  locationText: row.location_text,
  isPinned: row.is_pinned === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
  completedAt: row.completed_at,
});

export class SqliteEntryRepository implements EntryRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly deps: RepositoryDeps,
  ) {}

  async listInCollection(collectionId: string, { archived }: { archived: boolean }) {
    const rows = await this.db.all<EntryRow>(
      `SELECT ${COLUMNS} FROM entries
       WHERE collection_id = ? AND (archived_at IS NOT NULL) = ? ${ORDER}`,
      [collectionId, archived ? 1 : 0],
    );
    return rows.map(toEntry);
  }

  async listInbox({ archived }: { archived: boolean }) {
    const rows = await this.db.all<EntryRow>(
      `SELECT ${COLUMNS} FROM entries
       WHERE collection_id IS NULL AND (archived_at IS NOT NULL) = ? ${ORDER}`,
      [archived ? 1 : 0],
    );
    return rows.map(toEntry);
  }

  async get(id: string): Promise<Entry | undefined> {
    const row = await this.db.get<EntryRow>(`SELECT ${COLUMNS} FROM entries WHERE id = ?`, [id]);
    return row && toEntry(row);
  }

  private async require(id: string): Promise<Entry> {
    const entry = await this.get(id);
    if (!entry) throw new DomainError('not-found');
    return entry;
  }

  /** The category's template; with `forNewUse`, the category must also not be archived. */
  private async templateOf(categoryId: string, forNewUse: boolean): Promise<TemplateKey> {
    const row = await this.db.get<{ template_key: string; archived_at: string | null }>(
      'SELECT template_key, archived_at FROM categories WHERE id = ?',
      [categoryId],
    );
    if (!row || !isTemplateKey(row.template_key)) {
      throw new DomainError('not-found', 'category not found');
    }
    if (forNewUse && row.archived_at !== null) throw new DomainError('category-archived');
    return row.template_key;
  }

  /** An archived collection accepts no new entries (O-025). */
  private async requireActiveCollection(collectionId: string): Promise<void> {
    const row = await this.db.get<{ archived_at: string | null }>(
      'SELECT archived_at FROM collections WHERE id = ?',
      [collectionId],
    );
    if (!row) throw new DomainError('not-found', 'collection not found');
    if (row.archived_at !== null) throw new DomainError('collection-archived');
  }

  /**
   * Checks a target placement and returns its template. Only what changes is checked for being
   * active, so entries already in an archived collection or category stay editable.
   */
  private async checkPlacement(
    target: EntryPlacement,
    current?: EntryPlacement,
  ): Promise<TemplateKey | null> {
    if (target.kind === 'inbox') return null;
    const sameCollection =
      current?.kind === 'assigned' && current.collectionId === target.collectionId;
    const sameCategory = current?.kind === 'assigned' && current.categoryId === target.categoryId;
    if (!sameCollection) await this.requireActiveCollection(target.collectionId);
    return this.templateOf(target.categoryId, !sameCategory);
  }

  async create(input: EntryInput): Promise<Entry> {
    const title = validateTitle(input.title);
    const description = validateDescription(input.description);
    const priority = validatePriority(input.priority);
    const id = newUserId(this.deps);
    const now = this.deps.now();
    const { collectionId, categoryId } = placementColumns(input.placement);
    await this.db.transaction(async () => {
      const template = await this.checkPlacement(input.placement);
      const status = resolveStatus(template, input.status);
      const completedAt = completedAtFor(
        template,
        status,
        { status: null, completedAt: null },
        now,
      );
      await this.db.run(
        `INSERT INTO entries (id, collection_id, category_id, title, description, status,
           priority, completed_at, search_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          collectionId,
          categoryId,
          title,
          description,
          status,
          priority,
          completedAt,
          entrySearchText([title, description]),
          now,
          now,
        ],
      );
    });
    return this.require(id);
  }

  async update(id: string, changes: EntryChanges): Promise<Entry> {
    const now = this.deps.now();
    await this.db.transaction(async () => {
      const current = await this.require(id);
      const title = changes.title === undefined ? current.title : validateTitle(changes.title);
      const description =
        changes.description === undefined
          ? current.description
          : validateDescription(changes.description);
      const priority =
        changes.priority === undefined ? current.priority : validatePriority(changes.priority);
      const placement = changes.placement ?? current.placement;

      const template = await this.checkPlacement(placement, current.placement);
      const currentTemplate =
        current.placement.kind === 'assigned'
          ? await this.templateOf(current.placement.categoryId, false)
          : null;
      // O-021: a template change (or a move to the Inbox) resets the status.
      const keep = template === currentTemplate ? current.status : null;
      const status = resolveStatus(template, changes.status, keep);
      const completedAt = completedAtFor(template, status, current, now);
      const { collectionId, categoryId } = placementColumns(placement);

      await this.db.run(
        `UPDATE entries SET collection_id = ?, category_id = ?, title = ?, description = ?,
           status = ?, priority = ?, completed_at = ?, search_text = ?, updated_at = ?
         WHERE id = ?`,
        [
          collectionId,
          categoryId,
          title,
          description,
          status,
          priority,
          completedAt,
          entrySearchText([title, description, current.locationText]),
          now,
          id,
        ],
      );
    });
    return this.require(id);
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    await this.require(id);
    await this.db.run('UPDATE entries SET is_pinned = ?, updated_at = ? WHERE id = ?', [
      pinned ? 1 : 0,
      this.deps.now(),
      id,
    ]);
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.require(id);
    const now = this.deps.now();
    await this.db.run('UPDATE entries SET archived_at = ?, updated_at = ? WHERE id = ?', [
      archived ? now : null,
      now,
      id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.require(id);
      await this.db.run('DELETE FROM entries WHERE id = ?', [id]);
    });
  }
}
