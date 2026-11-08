/**
 * Database key handling (O-019): a random 256-bit key, stored hex-encoded, applied with
 * SQLCipher's raw-key form so SQLCipher skips its passphrase KDF. Never log key values.
 */
const KEY_PATTERN = /^[0-9a-f]{64}$/;

export function isValidDatabaseKey(value: unknown): value is string {
  return typeof value === 'string' && KEY_PATTERN.test(value);
}

export function generateDatabaseKey(randomBytes: (count: number) => Uint8Array): string {
  const bytes = randomBytes(32);
  if (bytes.length !== 32) {
    throw new Error('Random source returned the wrong number of bytes');
  }
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  if (/^0+$/.test(key)) {
    // A broken random source; refuse rather than encrypt with a predictable key.
    throw new Error('Random source returned all zero bytes');
  }
  return key;
}

/**
 * `PRAGMA key` cannot take bound parameters, so the statement is built from the key itself.
 * Only a validated 64-hex-character key is accepted, which makes injection impossible.
 */
export function keyPragma(key: string): string {
  if (!isValidDatabaseKey(key)) {
    throw new Error('Refusing to apply an invalid database key');
  }
  return `PRAGMA key = "x'${key}'"`;
}
