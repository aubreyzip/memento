import { generateDatabaseKey, isValidDatabaseKey } from '@/database/bootstrap/database-key';
import type { DatabaseKeyStore } from '@/database/bootstrap/ports';
import { hexToBytes } from '@/features/photos/media-cipher';

/** SecureStore entry of the media key, separate from the database key (O-008, O-019). */
export const MEDIA_KEY_NAME = 'memento.media-key.v1';

export class MediaKeyUnreadableError extends Error {
  constructor() {
    super('The stored media key is not valid');
    this.name = 'MediaKeyUnreadableError';
  }
}

/**
 * The per-install media key: a random 256-bit key, created on first use and stored like the
 * database key (this device only, after first unlock, no `requireAuthentication`). A stored value
 * that is not a valid key is never overwritten, so a fault cannot silently orphan photos.
 * Never log the key.
 */
export function createMediaKeyProvider(
  store: DatabaseKeyStore,
  randomBytes: (count: number) => Uint8Array,
): () => Promise<Uint8Array> {
  let pending: Promise<Uint8Array> | null = null;

  const load = async () => {
    const stored = await store.get();
    if (stored !== null) {
      if (!isValidDatabaseKey(stored)) throw new MediaKeyUnreadableError();
      return hexToBytes(stored);
    }
    const created = generateDatabaseKey(randomBytes);
    await store.set(created);
    return hexToBytes(created);
  };

  return () => {
    // One load at a time, so two first uses cannot create two keys; a failure is retried later.
    pending ??= load().catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}
