import { randomUUID } from 'node:crypto';

import { initializeSchema } from '@/database/initialize-schema';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '@/database/testing/node-sql-database';
import { mediaPaths } from '@/domain/attachments';
import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';
import { assignedTo, INBOX } from '@/domain/entry-placement';
import { LIMITS } from '@/domain/limits';
import { SqliteAttachmentRepository } from '@/repositories/attachment-repository';
import { SqliteCollectionRepository } from '@/repositories/collection-repository';
import { SqliteEntryRepository } from '@/repositories/entry-repository';

import { PhotoService } from '../photo-service';
import { createFakeMediaPorts, fakeImageBytes } from '../testing/fake-media';

const NOW = '2026-11-16T10:00:00.000Z';
const NOTES = BUILT_IN_CATEGORIES.find((c) => c.key === 'GENERAL_NOTES')!.id;
const MB = 1024 * 1024;

const contains = (haystack: Uint8Array, needle: string) =>
  Buffer.from(haystack).includes(Buffer.from(needle, 'latin1'));

describe('photos (FR-049, FR-050, O-008, O-031)', () => {
  let db: NodeSqlDatabase;
  let media: ReturnType<typeof createFakeMediaPorts>;
  let photos: PhotoService;
  let entries: SqliteEntryRepository;
  let collections: SqliteCollectionRepository;
  let attachments: SqliteAttachmentRepository;
  let entryId: string;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await initializeSchema(db, { now: () => NOW });
    const deps = { now: () => NOW, newId: randomUUID };
    media = createFakeMediaPorts();
    entries = new SqliteEntryRepository(db, deps);
    collections = new SqliteCollectionRepository(db, deps);
    attachments = new SqliteAttachmentRepository(db, deps.now);
    photos = new PhotoService({
      ...media.ports,
      attachments,
      entries,
      collections,
      newId: randomUUID,
    });
    entryId = (await entries.create({ placement: INBOX, title: 'Synthetic' })).id;
  });
  afterEach(() => db.close());

  const pick = (...names: string[]) =>
    media.intake.queue(...names.map((uri) => ({ uri, byteSize: 1000 })));

  it('stores encrypted photo and thumbnail files and their metadata', async () => {
    pick('a.jpg', 'b.jpg');

    expect(await photos.addFromLibrary(entryId)).toEqual({ added: 2, tooLarge: 0, failed: 0 });

    const list = await photos.list(entryId);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      entryId,
      mimeType: 'image/jpeg',
      width: 2048,
      height: 1536,
      encryption: 'AES-256-GCM/MMD1',
      sortOrder: 1,
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(list[1].sortOrder).toBe(2);
    expect(list[0].relativePath).toBe(mediaPaths(list[0].id).original);

    expect(media.store.files.size).toBe(4);
    for (const file of media.store.files.values()) {
      expect(contains(file, 'SYNTHETIC-JPEG')).toBe(false);
    }
    expect(media.intake.discarded).toEqual(['a.jpg', 'b.jpg']);
  });

  it('decrypts photos in memory as data URIs, or reports them unavailable', async () => {
    pick('a.jpg');
    await photos.addFromLibrary(entryId);
    const [photo] = await photos.list(entryId);

    const uri = await photos.load(photo, 'thumbnail');
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);
    expect(Buffer.from(uri!.split(',')[1], 'base64')).toEqual(
      Buffer.from(fakeImageBytes('a.jpg', 320)),
    );

    const file = media.store.files.get(photo.relativePath)!;
    file[file.length - 1] ^= 1;
    expect(await photos.load(photo, 'original')).toBeNull();
    media.store.files.delete(photo.thumbnailPath);
    expect(await photos.load(photo, 'thumbnail')).toBeNull();
  });

  it('offers only the room left and stops at the limit (O-027)', async () => {
    pick(...Array.from({ length: LIMITS.photosPerEntry - 1 }, (_, i) => `${i}.jpg`));
    await photos.addFromLibrary(entryId);

    pick('last.jpg', 'extra.jpg');
    expect(await photos.addFromLibrary(entryId)).toMatchObject({ added: 1 });
    expect(media.intake.lastLimit).toBe(1);

    await expect(photos.addFromLibrary(entryId)).rejects.toMatchObject({
      code: 'too-many-photos',
      values: { max: LIMITS.photosPerEntry },
    });
  });

  it('skips photos over the intake size limit (O-027, O-031)', async () => {
    media.intake.queue(
      { uri: 'big.jpg', byteSize: 20 * MB + 1 },
      { uri: 'ok.jpg', byteSize: 20 * MB },
    );

    expect(await photos.addFromLibrary(entryId)).toEqual({ added: 1, tooLarge: 1, failed: 0 });
    expect(media.intake.discarded).toContain('big.jpg');
  });

  it('removes written files when a photo cannot be recorded', async () => {
    pick('a.jpg');
    media.intake.failing.add('broken.jpg');
    media.intake.queue({ uri: 'broken.jpg', byteSize: 10 }, { uri: 'a.jpg', byteSize: 10 });
    expect(await photos.addFromLibrary(entryId)).toEqual({ added: 1, tooLarge: 0, failed: 1 });

    media.store.failWrites = true;
    pick('c.jpg');
    expect(await photos.addFromLibrary(entryId)).toEqual({ added: 0, tooLarge: 0, failed: 1 });
    media.store.failWrites = false;

    await entries.delete(entryId);
    const orphan = await entries.create({ placement: INBOX, title: 'Other' });
    await db.run('DELETE FROM entries WHERE id = ?', [orphan.id]);
    pick('d.jpg');
    await expect(photos.addFromLibrary(orphan.id)).rejects.toMatchObject({ code: 'not-found' });
    // Only the first photo's two files remain (from the deleted entry, which is cleaned below).
    expect(media.store.files.size).toBe(2);
  });

  it('deletes files with the photo, the entry, or the collection', async () => {
    pick('a.jpg', 'b.jpg');
    await photos.addFromLibrary(entryId);
    const [first] = await photos.list(entryId);

    await photos.remove(first.id);
    expect(await photos.list(entryId)).toHaveLength(1);
    expect(media.store.files.size).toBe(2);

    await photos.deleteEntry(entryId);
    expect(media.store.files.size).toBe(0);

    const home = await collections.create({
      typeId: BUILT_IN_COLLECTION_TYPES[1].id,
      name: 'Home',
    });
    const inHome = await entries.create({ placement: assignedTo(home.id, NOTES), title: 'Lamp' });
    pick('c.jpg');
    await photos.addFromLibrary(inHome.id);
    expect(media.store.files.size).toBe(2);

    await photos.deleteCollection(home.id);
    expect(media.store.files.size).toBe(0);
    expect(await attachments.listForEntry(inHome.id)).toEqual([]);
  });
});
