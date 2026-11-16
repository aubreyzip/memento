import {
  ascii,
  bytesToHex,
  createMediaCipher,
  mediaAad,
  type AesGcm,
} from '@/features/photos/media-cipher';

/**
 * Gate G8 (PHASE_0_REPORT §7, O-008): the device's AES-GCM, as the app uses it for photos.
 * All inputs are synthetic; no key is the app's media key.
 */

/** Known-answer vector, computed with Node's OpenSSL (`nodeAesGcm`); see media-cipher tests. */
export const G8_VECTOR = {
  key: Uint8Array.from({ length: 32 }, (_, i) => i),
  iv: Uint8Array.from({ length: 12 }, (_, i) => 0xa0 + i),
  plaintext: ascii('Memento G8 known-answer vector'),
  aad: mediaAad('00000000-0000-4000-8000-000000000000', 'original'),
  /** Ciphertext followed by the 16-byte tag, hex. */
  expected:
    'ab7d11482bbf6d9f255da7b86915b7b05dcd3763e5d2304cea6b45f210d94b80dcba78adf7bce9c432f04aa3179f',
};

export const G8_ROUND_TRIP_BYTES = 5 * 1024 * 1024;

type Check = (id: string, gate: string, task: () => Promise<string | void>) => Promise<boolean>;

class CheckFailed extends Error {}

function expectThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CheckFailed(message);
}

async function rejects(task: () => Promise<unknown>): Promise<boolean> {
  try {
    await task();
    return false;
  } catch {
    return true;
  }
}

/** Random bytes in chunks (platform random sources cap a single request at 1024 bytes). */
function randomFill(size: number, randomBytes: (count: number) => Uint8Array): Uint8Array {
  const out = new Uint8Array(size);
  for (let offset = 0; offset < size; offset += 1024) {
    out.set(randomBytes(Math.min(1024, size - offset)), offset);
  }
  return out;
}

export async function runMediaChecks(
  check: Check,
  aes: AesGcm,
  randomBytes: (count: number) => Uint8Array,
): Promise<void> {
  await check('media-aes-gcm-vector', 'G8', async () => {
    const { key, iv, plaintext, aad, expected } = G8_VECTOR;
    const result = await aes.encrypt(key, plaintext, aad, iv);
    expectThat(bytesToHex(result.sealed) === expected, 'ciphertext differs from the Node vector');
    const opened = await aes.decrypt(key, iv, result.sealed, aad);
    expectThat(bytesToHex(opened) === bytesToHex(plaintext), 'vector did not decrypt');
    return 'matches the Node (OpenSSL) vector';
  });

  const key = randomBytes(32);
  const cipher = createMediaCipher(aes, async () => key);
  const id = '00000000-0000-4000-8000-0000000000a8';

  await check('media-aes-gcm-round-trip', 'G8', async () => {
    const plaintext = randomFill(G8_ROUND_TRIP_BYTES, randomBytes);
    const started = Date.now();
    const file = await cipher.seal(plaintext, mediaAad(id, 'original'));
    const opened = await cipher.open(file, mediaAad(id, 'original'));
    const ms = Date.now() - started;
    expectThat(opened.length === plaintext.length, 'length differs');
    expectThat(
      opened.every((b, i) => b === plaintext[i]),
      'content differs',
    );
    return `5 MB sealed and opened in ${ms} ms`;
  });

  await check('media-aes-gcm-tamper', 'G8', async () => {
    const plaintext = randomFill(4096, randomBytes);
    const file = await cipher.seal(plaintext, mediaAad(id, 'original'));
    const altered = file.slice();
    altered[altered.length - 100] ^= 0x01;
    expectThat(
      await rejects(() => cipher.open(altered, mediaAad(id, 'original'))),
      'altered ciphertext accepted',
    );
    expectThat(
      await rejects(() => cipher.open(file, mediaAad(id, 'thumbnail'))),
      'other variant accepted',
    );
    const other = '00000000-0000-4000-8000-0000000000a9';
    expectThat(
      await rejects(() => cipher.open(file, mediaAad(other, 'original'))),
      'other attachment accepted',
    );
    const wrongKey = createMediaCipher(aes, async () => randomBytes(32));
    expectThat(
      await rejects(() => wrongKey.open(file, mediaAad(id, 'original'))),
      'wrong key accepted',
    );
    return 'altered data, wrong AAD, and wrong key are rejected';
  });
}
