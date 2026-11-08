import { randomBytes } from 'node:crypto';

import { generateDatabaseKey, isValidDatabaseKey, keyPragma } from '../database-key';

describe('database key (O-019)', () => {
  it('generates 64 lowercase hex characters (256 bits)', () => {
    const key = generateDatabaseKey((n) => new Uint8Array(randomBytes(n)));
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates different keys from a real random source', () => {
    const source = (n: number) => new Uint8Array(randomBytes(n));
    expect(generateDatabaseKey(source)).not.toBe(generateDatabaseKey(source));
  });

  it('refuses a random source that returns the wrong length or all zeros', () => {
    expect(() => generateDatabaseKey((n) => new Uint8Array(n - 1))).toThrow();
    expect(() => generateDatabaseKey((n) => new Uint8Array(n))).toThrow(/zero/);
  });

  it('builds the raw-key PRAGMA only from a valid key', () => {
    const key = 'ab'.repeat(32);
    expect(keyPragma(key)).toBe(`PRAGMA key = "x'${key}'"`);
  });

  it.each([
    '',
    'AB'.repeat(32),
    'ab'.repeat(31),
    `${'ab'.repeat(31)}'"; DROP TABLE entries; --`,
    'passphrase',
  ])('rejects %p (prevents malformed or injected PRAGMA statements)', (value) => {
    expect(isValidDatabaseKey(value)).toBe(false);
    expect(() => keyPragma(value)).toThrow();
  });
});
