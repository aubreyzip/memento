import { randomBytes } from 'node:crypto';

import { G8_VECTOR } from '@/features/device-checks/media-checks';
import { createMediaKeyProvider, MediaKeyUnreadableError } from '@/services/security/media-key';

import {
  ascii,
  bytesToBase64,
  bytesToHex,
  createMediaCipher,
  hexToBytes,
  IV_LENGTH,
  MEDIA_FILE_MAGIC,
  MediaFormatError,
  mediaAad,
  TAG_LENGTH,
} from '../media-cipher';
import { nodeAesGcm } from '../testing/node-aes-gcm';

const ID = '6f1c1d36-5b0e-4a51-9a4e-0d6c2f6b1a10';
const key = new Uint8Array(randomBytes(32));
const cipher = createMediaCipher(nodeAesGcm, async () => key);
const plaintext = ascii('SYNTHETIC-PHOTO-BYTES-'.repeat(50));

describe('photo file encryption (O-008)', () => {
  it('lays out magic, IV, ciphertext, and tag, and round-trips', async () => {
    const file = await cipher.seal(plaintext, mediaAad(ID, 'original'));

    expect(file.subarray(0, 4)).toEqual(MEDIA_FILE_MAGIC);
    expect(file.length).toBe(4 + IV_LENGTH + plaintext.length + TAG_LENGTH);
    expect(Buffer.from(file).includes(Buffer.from('SYNTHETIC-PHOTO'))).toBe(false);
    expect(await cipher.open(file, mediaAad(ID, 'original'))).toEqual(plaintext);
  });

  it('uses a fresh IV for every file', async () => {
    const a = await cipher.seal(plaintext, mediaAad(ID, 'original'));
    const b = await cipher.seal(plaintext, mediaAad(ID, 'original'));
    expect(a.subarray(4, 4 + IV_LENGTH)).not.toEqual(b.subarray(4, 4 + IV_LENGTH));
  });

  it('rejects a file opened as another attachment or variant, altered, or with another key', async () => {
    const file = await cipher.seal(plaintext, mediaAad(ID, 'original'));
    const altered = file.slice();
    altered[20] ^= 1;
    const otherKey = createMediaCipher(nodeAesGcm, async () => new Uint8Array(randomBytes(32)));

    await expect(cipher.open(file, mediaAad(ID, 'thumbnail'))).rejects.toThrow();
    await expect(cipher.open(file, mediaAad(`${ID.slice(0, -1)}1`, 'original'))).rejects.toThrow();
    await expect(cipher.open(altered, mediaAad(ID, 'original'))).rejects.toThrow();
    await expect(otherKey.open(file, mediaAad(ID, 'original'))).rejects.toThrow();
  });

  it('rejects files that are not in the format', async () => {
    await expect(cipher.open(ascii('JPEG....'), mediaAad(ID, 'original'))).rejects.toBeInstanceOf(
      MediaFormatError,
    );
  });

  it('reproduces the G8 known-answer vector with OpenSSL', async () => {
    const { key: k, iv, plaintext: p, aad, expected } = G8_VECTOR;
    const { sealed } = await nodeAesGcm.encrypt(k, p, aad, iv);
    expect(bytesToHex(sealed)).toBe(expected);
  });

  it('encodes base64 and hex like Node', () => {
    const bytes = new Uint8Array(randomBytes(100_000));
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });
});

describe('media key (O-008, O-019)', () => {
  const memoryStore = (initial: string | null) => {
    let value = initial;
    const store = {
      writes: 0,
      get: jest.fn(async () => value),
      set: async (next: string) => {
        store.writes++;
        value = next;
      },
    };
    return store;
  };
  const random = (n: number) => new Uint8Array(randomBytes(n));

  it('creates one key on first use, even for concurrent first uses, and reuses it', async () => {
    const store = memoryStore(null);
    const provider = createMediaKeyProvider(store, random);

    const [a, b] = await Promise.all([provider(), provider()]);
    const again = await createMediaKeyProvider(store, random)();

    expect(a).toHaveLength(32);
    expect(b).toEqual(a);
    expect(again).toEqual(a);
    expect(store.writes).toBe(1);
  });

  it('never overwrites a stored value that is not a valid key', async () => {
    const store = memoryStore('not-a-key');
    await expect(createMediaKeyProvider(store, random)()).rejects.toBeInstanceOf(
      MediaKeyUnreadableError,
    );
    expect(store.writes).toBe(0);
  });

  it('retries after storage fails', async () => {
    const store = memoryStore(null);
    store.get.mockRejectedValueOnce(new Error('locked'));
    const provider = createMediaKeyProvider(store, random);

    await expect(provider()).rejects.toThrow('locked');
    await expect(provider()).resolves.toHaveLength(32);
  });
});
