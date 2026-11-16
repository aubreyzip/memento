import type { MediaVariant } from '@/domain/attachments';

/**
 * Per-file photo encryption (O-008 option A). AES-256-GCM comes from a vetted implementation
 * (`expo-crypto` on device, `node:crypto` in tests) behind `AesGcm`; nothing here implements
 * cryptography, it only lays out the file:
 *
 *   "MMD1" (4 bytes) | IV (12 random bytes) | ciphertext | GCM tag (16 bytes)
 *
 * The additional authenticated data binds each file to its attachment ID and variant, so a file
 * moved to another attachment, or a thumbnail swapped for a photo, fails to decrypt.
 */

/** Authenticated encryption primitive (AES-256-GCM, 12-byte IV, 16-byte tag). */
export interface AesGcm {
  /** Encrypts with a fresh random IV, or `iv` when given (only for known-answer checks). */
  encrypt(
    key: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array,
    iv?: Uint8Array,
  ): Promise<{ iv: Uint8Array; sealed: Uint8Array }>;
  /** Decrypts `sealed` (ciphertext followed by the tag); rejects if anything was altered. */
  decrypt(
    key: Uint8Array,
    iv: Uint8Array,
    sealed: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array>;
}

export interface MediaCipher {
  seal(plaintext: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
  open(file: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
}

export const MEDIA_FILE_MAGIC = ascii('MMD1');
export const IV_LENGTH = 12;
export const TAG_LENGTH = 16;

export class MediaFormatError extends Error {
  constructor() {
    super('Not a Memento media file');
    this.name = 'MediaFormatError';
  }
}

export function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** AAD for one file: format, attachment ID, and variant (IDs are ASCII UUIDs). */
export const mediaAad = (attachmentId: string, variant: MediaVariant) =>
  ascii(`memento-media-v1|${attachmentId}|${variant}`);

export function createMediaCipher(aes: AesGcm, key: () => Promise<Uint8Array>): MediaCipher {
  return {
    async seal(plaintext, aad) {
      const { iv, sealed } = await aes.encrypt(await key(), plaintext, aad);
      if (iv.length !== IV_LENGTH) throw new Error('Unexpected IV length');
      return concatBytes(MEDIA_FILE_MAGIC, iv, sealed);
    },
    async open(file, aad) {
      const header = MEDIA_FILE_MAGIC.length;
      if (
        file.length < header + IV_LENGTH + TAG_LENGTH ||
        !MEDIA_FILE_MAGIC.every((byte, i) => file[i] === byte)
      ) {
        throw new MediaFormatError();
      }
      const iv = file.subarray(header, header + IV_LENGTH);
      return aes.decrypt(await key(), iv, file.subarray(header + IV_LENGTH), aad);
    },
  };
}

const BASE64_CHUNK = 0x8000;

/** Bytes as base64, for `data:` URIs (decrypted photos are shown from memory, never disk). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error('Invalid hex');
  return Uint8Array.from({ length: hex.length / 2 }, (_, i) =>
    parseInt(hex.slice(i * 2, i * 2 + 2), 16),
  );
}

export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
