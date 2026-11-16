/**
 * Photo attachments (DATABASE_DESIGN §3.7, O-008, O-031, O-037, O-059). Files live in app-private
 * storage under generated names, encrypted per file; SQLite holds the metadata.
 */
export type Attachment = {
  id: string;
  entryId: string;
  /** Encrypted re-encoded photo, relative to the app's document directory. */
  relativePath: string;
  /** Encrypted thumbnail for lists. */
  thumbnailPath: string;
  mimeType: string;
  /** Size of the re-encoded photo before encryption. */
  fileSizeBytes: number;
  width: number;
  height: number;
  /** SHA-256 of the re-encoded photo before encryption, hex; for backup verification. */
  contentHash: string;
  /** File format and cipher version, so later formats can be read alongside this one. */
  encryption: string;
  sortOrder: number;
  createdAt: string;
};

export type MediaVariant = 'original' | 'thumbnail';

/** Intake settings (O-031, O-059), defined once (O-056). Limits are in `LIMITS`. */
export const PHOTO_INTAKE = {
  /** Long edge of the stored photo in pixels. */
  longEdge: 2048,
  thumbnailLongEdge: 320,
  /** JPEG quality, 0–1. */
  quality: 0.85,
  mimeType: 'image/jpeg',
} as const;

/** The current encrypted file format (see `media-cipher.ts`). */
export const MEDIA_ENCRYPTION = 'AES-256-GCM/MMD1';

export const MEDIA_DIRECTORY = 'media';

/** Generated, opaque file paths: never derived from user input or picked file names (SDD §9). */
export function mediaPaths(attachmentId: string): Record<MediaVariant, string> {
  return {
    original: `${MEDIA_DIRECTORY}/${attachmentId}.bin`,
    thumbnail: `${MEDIA_DIRECTORY}/${attachmentId}.thumb.bin`,
  };
}
