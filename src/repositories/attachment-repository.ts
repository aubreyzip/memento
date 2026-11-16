import type { SqlDatabase } from '@/database/connection/sql-database';
import type { Attachment } from '@/domain/attachments';
import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';

export type AttachmentInput = Omit<Attachment, 'sortOrder' | 'createdAt'>;

/** Attachment metadata (DATABASE_DESIGN §3.7). Files are handled by the photo service. */
export interface AttachmentRepository {
  listForEntry(entryId: string): Promise<Attachment[]>;
  get(id: string): Promise<Attachment | undefined>;
  /** Adds a row after the entry's last photo; refuses more than the per-entry limit (O-027). */
  create(input: AttachmentInput): Promise<Attachment>;
  delete(id: string): Promise<void>;
  /** Every file path (photos and thumbnails) of an entry's attachments. */
  filesForEntry(entryId: string): Promise<string[]>;
  /** Every file path of the attachments of a collection's entries. */
  filesForCollection(collectionId: string): Promise<string[]>;
}

type AttachmentRow = {
  id: string;
  entry_id: string;
  relative_path: string;
  thumbnail_path: string;
  mime_type: string;
  file_size_bytes: number;
  width: number;
  height: number;
  content_hash: string;
  encryption: string;
  sort_order: number;
  created_at: string;
};

const COLUMNS = `id, entry_id, relative_path, thumbnail_path, mime_type, file_size_bytes, width,
  height, content_hash, encryption, sort_order, created_at`;

const toAttachment = (row: AttachmentRow): Attachment => ({
  id: row.id,
  entryId: row.entry_id,
  relativePath: row.relative_path,
  thumbnailPath: row.thumbnail_path,
  mimeType: row.mime_type,
  fileSizeBytes: row.file_size_bytes,
  width: row.width,
  height: row.height,
  contentHash: row.content_hash,
  encryption: row.encryption,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
});

const filePaths = (rows: { relative_path: string; thumbnail_path: string }[]) =>
  rows.flatMap((row) => [row.relative_path, row.thumbnail_path]);

export class SqliteAttachmentRepository implements AttachmentRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => string,
  ) {}

  async listForEntry(entryId: string): Promise<Attachment[]> {
    const rows = await this.db.all<AttachmentRow>(
      `SELECT ${COLUMNS} FROM entry_attachments WHERE entry_id = ? ORDER BY sort_order, id`,
      [entryId],
    );
    return rows.map(toAttachment);
  }

  async get(id: string): Promise<Attachment | undefined> {
    const row = await this.db.get<AttachmentRow>(
      `SELECT ${COLUMNS} FROM entry_attachments WHERE id = ?`,
      [id],
    );
    return row && toAttachment(row);
  }

  async create(input: AttachmentInput): Promise<Attachment> {
    await this.db.transaction(async () => {
      const entry = await this.db.get<{ id: string }>('SELECT id FROM entries WHERE id = ?', [
        input.entryId,
      ]);
      if (!entry) throw new DomainError('not-found', 'entry not found');
      const stats = await this.db.get<{ n: number; last: number | null }>(
        'SELECT count(*) AS n, max(sort_order) AS last FROM entry_attachments WHERE entry_id = ?',
        [input.entryId],
      );
      if ((stats?.n ?? 0) >= LIMITS.photosPerEntry) {
        throw new DomainError('too-many-photos', { max: LIMITS.photosPerEntry });
      }
      await this.db.run(
        `INSERT INTO entry_attachments (id, entry_id, relative_path, thumbnail_path, mime_type,
           file_size_bytes, width, height, content_hash, encryption, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.entryId,
          input.relativePath,
          input.thumbnailPath,
          input.mimeType,
          input.fileSizeBytes,
          input.width,
          input.height,
          input.contentHash,
          input.encryption,
          (stats?.last ?? 0) + 1,
          this.now(),
        ],
      );
    });
    const created = await this.get(input.id);
    if (!created) throw new DomainError('not-found');
    return created;
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM entry_attachments WHERE id = ?', [id]);
  }

  async filesForEntry(entryId: string): Promise<string[]> {
    return filePaths(
      await this.db.all(
        'SELECT relative_path, thumbnail_path FROM entry_attachments WHERE entry_id = ?',
        [entryId],
      ),
    );
  }

  async filesForCollection(collectionId: string): Promise<string[]> {
    return filePaths(
      await this.db.all(
        `SELECT a.relative_path, a.thumbnail_path
         FROM entry_attachments a JOIN entries e ON e.id = a.entry_id
         WHERE e.collection_id = ?`,
        [collectionId],
      ),
    );
  }
}
