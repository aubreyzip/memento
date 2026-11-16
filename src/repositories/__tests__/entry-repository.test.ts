import { randomUUID } from 'node:crypto';

import { initializeSchema } from '@/database/initialize-schema';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '@/database/testing/node-sql-database';
import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';
import { assignedTo, INBOX } from '@/domain/entry-placement';
import type { DomainError } from '@/domain/errors';

import { SqliteCategoryRepository } from '../catalog-repositories';
import { SqliteCollectionRepository } from '../collection-repository';
import { SqliteEntryRepository } from '../entry-repository';
import type { RepositoryDeps } from '../repository-deps';

const category = (key: string) => BUILT_IN_CATEGORIES.find((c) => c.key === key)!.id;
const TASKS = category('TASKS_REPAIRS');
const WISHLIST = category('WISHLIST');
const NOTES = category('GENERAL_NOTES');
const EVENTS = category('IMPORTANT_DATES');

const rejectsWith = (promise: Promise<unknown>, code: DomainError['code']) =>
  expect(promise).rejects.toEqual(expect.objectContaining({ name: 'DomainError', code }));

describe('entries (FR-040 to FR-047, O-021 to O-025)', () => {
  let db: NodeSqlDatabase;
  let clock: number;
  let entries: SqliteEntryRepository;
  let collections: SqliteCollectionRepository;
  let categories: SqliteCategoryRepository;
  let home: string;

  // Each call returns a later time, so ordering by updated_at is deterministic.
  const now = () => new Date(Date.UTC(2026, 10, 16, 10, 0, clock++)).toISOString();

  beforeEach(async () => {
    clock = 0;
    db = openNodeSqlDatabase();
    await initializeSchema(db, { now });
    const deps: RepositoryDeps = { now, newId: randomUUID };
    entries = new SqliteEntryRepository(db, deps);
    collections = new SqliteCollectionRepository(db, deps);
    categories = new SqliteCategoryRepository(db, deps);
    home = (await collections.create({ typeId: BUILT_IN_COLLECTION_TYPES[1].id, name: 'Home' })).id;
  });
  afterEach(() => db.close());

  it('creates an entry with the template default status', async () => {
    const entry = await entries.create({
      placement: assignedTo(home, TASKS),
      title: '  Fix the synthetic tap  ',
      priority: 'HIGH',
    });

    expect(entry).toMatchObject({
      placement: { kind: 'assigned', collectionId: home, categoryId: TASKS },
      title: 'Fix the synthetic tap',
      description: null,
      status: 'TODO',
      priority: 'HIGH',
      recurrence: 'NONE',
      isPinned: false,
      archivedAt: null,
      completedAt: null,
    });
  });

  it('gives Note entries and Inbox entries no status', async () => {
    const note = await entries.create({ placement: assignedTo(home, NOTES), title: 'Note' });
    const inbox = await entries.create({ placement: INBOX, title: 'Captured' });

    expect(note.status).toBeNull();
    expect(inbox.status).toBeNull();
    await rejectsWith(
      entries.create({ placement: assignedTo(home, NOTES), title: 'Note', status: 'TODO' }),
      'invalid-status',
    );
  });

  it('rejects a status the template does not offer', async () => {
    await rejectsWith(
      entries.create({ placement: assignedTo(home, TASKS), title: 'Task', status: 'PURCHASED' }),
      'invalid-status',
    );
  });

  it('sets and clears completed_at with the done status', async () => {
    const entry = await entries.create({ placement: assignedTo(home, WISHLIST), title: 'Lamp' });

    const bought = await entries.update(entry.id, { status: 'PURCHASED' });
    expect(bought.completedAt).not.toBeNull();

    const edited = await entries.update(entry.id, { title: 'Desk lamp' });
    expect(edited.completedAt).toBe(bought.completedAt);

    const reopened = await entries.update(entry.id, { status: 'PLANNED' });
    expect(reopened.completedAt).toBeNull();
  });

  it('resets the status when the template changes, keeps it otherwise', async () => {
    const entry = await entries.create({
      placement: assignedTo(home, TASKS),
      title: 'Task',
      status: 'COMPLETED',
    });

    const sameTemplate = await entries.update(entry.id, {
      placement: assignedTo(home, category('HOME_IMPROVEMENTS')),
    });
    expect(sameTemplate.status).toBe('COMPLETED');

    const otherTemplate = await entries.update(entry.id, { placement: assignedTo(home, EVENTS) });
    expect(otherTemplate.status).toBe('IDEA');
    expect(otherTemplate.completedAt).toBeNull();
  });

  it('clears the status on a move to the Inbox and keeps other values (O-022)', async () => {
    const entry = await entries.create({
      placement: assignedTo(home, TASKS),
      title: 'Task',
      priority: 'LOW',
    });

    const moved = await entries.update(entry.id, { placement: INBOX });

    expect(moved.placement).toEqual(INBOX);
    expect(moved.status).toBeNull();
    expect(moved.priority).toBe('LOW');
  });

  it('keeps stored values of fields the new template does not offer (O-022)', async () => {
    const entry = await entries.create({ placement: assignedTo(home, WISHLIST), title: 'Gift' });
    await db.run(`UPDATE entries SET price_minor = 2500, currency_code = 'EUR' WHERE id = ?`, [
      entry.id,
    ]);

    const moved = await entries.update(entry.id, { placement: assignedTo(home, NOTES) });

    expect(moved).toMatchObject({ priceMinor: 2500, currencyCode: 'EUR', status: null });
  });

  it('accepts no new entries in an archived collection (O-025) but keeps old ones editable', async () => {
    const entry = await entries.create({ placement: assignedTo(home, TASKS), title: 'Task' });
    await collections.setArchived(home, true);

    await rejectsWith(
      entries.create({ placement: assignedTo(home, TASKS), title: 'New' }),
      'collection-archived',
    );
    await expect(entries.update(entry.id, { title: 'Renamed' })).resolves.toMatchObject({
      title: 'Renamed',
    });
  });

  it('does not offer an archived category for new or moved entries', async () => {
    const entry = await entries.create({ placement: assignedTo(home, TASKS), title: 'Task' });
    await categories.setArchived(TASKS, true);

    await rejectsWith(
      entries.create({ placement: assignedTo(home, TASKS), title: 'New' }),
      'category-archived',
    );
    await expect(entries.update(entry.id, { priority: 'HIGH' })).resolves.toMatchObject({
      priority: 'HIGH',
    });
  });

  it('lists pinned entries first, then the most recently updated, by archive state', async () => {
    const first = await entries.create({ placement: assignedTo(home, NOTES), title: 'First' });
    const second = await entries.create({ placement: assignedTo(home, NOTES), title: 'Second' });
    const third = await entries.create({ placement: assignedTo(home, NOTES), title: 'Third' });
    await entries.setPinned(first.id, true);
    await entries.setArchived(second.id, true);

    const active = await entries.listInCollection(home, { archived: false });
    const archived = await entries.listInCollection(home, { archived: true });

    expect(active.map((e) => e.title)).toEqual(['First', 'Third']);
    expect(archived.map((e) => e.id)).toEqual([second.id]);
    expect(await entries.listInbox({ archived: false })).toEqual([]);
    expect(third.isPinned).toBe(false);
  });

  it('stores folded search text (O-026)', async () => {
    const entry = await entries.create({
      placement: INBOX,
      title: 'ŞULE İçin',
      description: 'Çiçek',
    });

    const row = await db.get<{ search_text: string }>(
      'SELECT search_text FROM entries WHERE id = ?',
      [entry.id],
    );
    expect(row?.search_text).toBe('sule icin\ncicek');
  });

  it('deletes an entry', async () => {
    const entry = await entries.create({ placement: assignedTo(home, NOTES), title: 'Gone' });

    await entries.delete(entry.id);

    expect(await entries.get(entry.id)).toBeUndefined();
    await rejectsWith(entries.delete(entry.id), 'not-found');
  });

  it('stores dates, repeat, price, and location, and keeps them across unrelated edits', async () => {
    const entry = await entries.create({
      placement: assignedTo(home, EVENTS),
      title: 'Synthetic concert',
      dateStart: '2026-12-01',
      dateEnd: '2026-12-02',
      startsAtUtc: '2026-12-01T18:00:00.000Z',
      endsAtUtc: '2026-12-01T21:00:00.000Z',
      priceMinor: 4500,
      currencyCode: 'eur',
      locationText: '  Synthetic hall  ',
    });
    expect(entry).toMatchObject({
      dateStart: '2026-12-01',
      dateEnd: '2026-12-02',
      startsAtUtc: '2026-12-01T18:00:00.000Z',
      endsAtUtc: '2026-12-01T21:00:00.000Z',
      recurrence: 'NONE',
      priceMinor: 4500,
      currencyCode: 'EUR',
      locationText: 'Synthetic hall',
    });

    const edited = await entries.update(entry.id, { title: 'Synthetic gig' });
    expect(edited).toMatchObject({ dateEnd: '2026-12-02', priceMinor: 4500 });

    const cleared = await entries.update(entry.id, {
      dateEnd: null,
      startsAtUtc: null,
      endsAtUtc: null,
      priceMinor: null,
      currencyCode: null,
      recurrence: 'YEARLY',
    });
    expect(cleared).toMatchObject({
      dateStart: '2026-12-01',
      dateEnd: null,
      recurrence: 'YEARLY',
      priceMinor: null,
      currencyCode: null,
    });
  });

  it('includes the location in the search text (O-026)', async () => {
    const entry = await entries.create({
      placement: assignedTo(home, EVENTS),
      title: 'Party',
      locationText: 'Kadıköy',
    });
    const row = await db.get<{ search_text: string }>(
      'SELECT search_text FROM entries WHERE id = ?',
      [entry.id],
    );
    expect(row?.search_text).toBe('party\nkadikoy');
  });

  it('rejects inconsistent dates and prices without changing the entry', async () => {
    const entry = await entries.create({
      placement: assignedTo(home, TASKS),
      title: 'Task',
      dateStart: '2026-12-01',
    });

    await rejectsWith(entries.update(entry.id, { dateEnd: '2026-11-30' }), 'invalid-date-range');
    await rejectsWith(
      entries.update(entry.id, {
        recurrence: 'WEEKLY',
        startsAtUtc: '2026-12-01T10:00:00.000Z',
      }),
      'invalid-recurrence',
    );
    await rejectsWith(entries.update(entry.id, { priceMinor: 100 }), 'invalid-currency');

    expect(await entries.get(entry.id)).toMatchObject({
      dateStart: '2026-12-01',
      priceMinor: null,
    });
  });

  it('rejects an unknown category or collection', async () => {
    await rejectsWith(
      entries.create({ placement: assignedTo(home, randomUUID()), title: 'X' }),
      'not-found',
    );
    await rejectsWith(
      entries.create({ placement: assignedTo(randomUUID(), TASKS), title: 'X' }),
      'not-found',
    );
  });
});
