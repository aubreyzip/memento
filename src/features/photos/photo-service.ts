import {
  MEDIA_ENCRYPTION,
  mediaPaths,
  PHOTO_INTAKE,
  type Attachment,
  type MediaVariant,
} from '@/domain/attachments';
import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';
import type { AttachmentRepository } from '@/repositories/attachment-repository';
import type { CollectionRepository } from '@/repositories/collection-repository';
import type { EntryRepository } from '@/repositories/entry-repository';

import { bytesToBase64, mediaAad } from './media-cipher';
import type { MediaPorts, PickedImage } from './ports';

export type AddPhotosResult = { added: number; tooLarge: number; failed: number };

/**
 * Photos on entries (FR-049, FR-050, O-008, O-031, O-037). Each picked photo is re-encoded,
 * encrypted with its own IV, written to app-private storage, and only then recorded in SQLite;
 * if recording fails, the files are removed. Deleting rows and files goes through here so no
 * encrypted file outlives its row. Never logs image content or paths (NFR-034).
 */
export class PhotoService {
  constructor(
    private readonly deps: MediaPorts & {
      attachments: AttachmentRepository;
      entries: EntryRepository;
      collections: CollectionRepository;
      newId: () => string;
    },
  ) {}

  list(entryId: string): Promise<Attachment[]> {
    return this.deps.attachments.listForEntry(entryId);
  }

  get(id: string): Promise<Attachment | undefined> {
    return this.deps.attachments.get(id);
  }

  /** Opens the picker for the photos the entry still has room for and adds them in order. */
  async addFromLibrary(entryId: string): Promise<AddPhotosResult> {
    const room = LIMITS.photosPerEntry - (await this.list(entryId)).length;
    if (room <= 0) throw new DomainError('too-many-photos', { max: LIMITS.photosPerEntry });

    const picked = await this.deps.intake.pick(room);
    const result: AddPhotosResult = { added: 0, tooLarge: 0, failed: 0 };
    try {
      for (const image of picked.slice(0, room)) {
        if (image.byteSize > LIMITS.imageIntakeBytes) {
          result.tooLarge++;
          continue;
        }
        try {
          await this.addOne(entryId, image);
          result.added++;
        } catch (error) {
          if (error instanceof DomainError) throw error;
          result.failed++;
        }
      }
    } finally {
      for (const image of picked) await this.quietly(() => this.deps.intake.discard(image));
    }
    return result;
  }

  private async addOne(entryId: string, image: PickedImage): Promise<void> {
    const { intake, cipher, store, attachments } = this.deps;
    const id = this.deps.newId();
    const paths = mediaPaths(id);
    const original = await intake.prepare(image, PHOTO_INTAKE.longEdge, PHOTO_INTAKE.quality);
    const thumbnail = await intake.prepare(
      image,
      PHOTO_INTAKE.thumbnailLongEdge,
      PHOTO_INTAKE.quality,
    );
    try {
      await store.write(
        paths.original,
        await cipher.seal(original.bytes, mediaAad(id, 'original')),
      );
      await store.write(
        paths.thumbnail,
        await cipher.seal(thumbnail.bytes, mediaAad(id, 'thumbnail')),
      );
      await attachments.create({
        id,
        entryId,
        relativePath: paths.original,
        thumbnailPath: paths.thumbnail,
        mimeType: PHOTO_INTAKE.mimeType,
        fileSizeBytes: original.bytes.length,
        width: original.width,
        height: original.height,
        contentHash: original.sha256,
        encryption: MEDIA_ENCRYPTION,
      });
    } catch (error) {
      await this.removeFiles([paths.original, paths.thumbnail]);
      throw error;
    }
  }

  /**
   * The photo as a `data:` URI decrypted in memory, or null when its file is missing, altered,
   * or the media key cannot open it. Plaintext is never written to disk for display.
   */
  async load(attachment: Attachment, variant: MediaVariant): Promise<string | null> {
    try {
      const path = variant === 'original' ? attachment.relativePath : attachment.thumbnailPath;
      const file = await this.deps.store.read(path);
      if (!file) return null;
      const bytes = await this.deps.cipher.open(file, mediaAad(attachment.id, variant));
      return `data:${attachment.mimeType};base64,${bytesToBase64(bytes)}`;
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.get(id);
    if (!attachment) return;
    await this.deps.attachments.delete(id);
    await this.removeFiles([attachment.relativePath, attachment.thumbnailPath]);
  }

  /** Deletes an entry and then its photo files (FR-056). */
  async deleteEntry(entryId: string): Promise<void> {
    const files = await this.deps.attachments.filesForEntry(entryId);
    await this.deps.entries.delete(entryId);
    await this.removeFiles(files);
  }

  /** Deletes a collection with its entries (FR-016) and then their photo files. */
  async deleteCollection(collectionId: string): Promise<void> {
    const files = await this.deps.attachments.filesForCollection(collectionId);
    await this.deps.collections.delete(collectionId);
    await this.removeFiles(files);
  }

  purgeTemporary(): Promise<void> {
    return this.quietly(() => this.deps.store.purgeTemporary());
  }

  /** File removal after a committed delete is best effort; a leftover file is unreadable. */
  private async removeFiles(paths: readonly string[]): Promise<void> {
    for (const path of paths) await this.quietly(() => this.deps.store.remove(path));
  }

  private async quietly(task: () => Promise<unknown>): Promise<void> {
    try {
      await task();
    } catch {
      // Never surface cleanup failures; they hold no user content.
    }
  }
}
