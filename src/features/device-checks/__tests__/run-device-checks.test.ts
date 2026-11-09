import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

import type { DatabaseFiles } from '@/database/bootstrap/ports';
import type { ClosableSqlDatabase } from '@/database/connection/sql-database';
import { openNodeSqlDatabase } from '@/database/testing/node-sql-database';

import {
  PLAINTEXT_MARKER,
  allPassed,
  bytesEqual,
  containsBytes,
  hasPlainSqliteHeader,
  runDeviceChecks,
  type DeviceCheckEnv,
  type DeviceCheckResult,
} from '../run-device-checks';

const bytes = (text: string) => Uint8Array.from(Buffer.from(text, 'latin1'));

describe('device check helpers', () => {
  it('recognizes the plain SQLite header', () => {
    expect(hasPlainSqliteHeader(bytes('SQLite format 3\u0000rest'))).toBe(true);
    expect(hasPlainSqliteHeader(bytes('\u00124random bytes....'))).toBe(false);
    expect(hasPlainSqliteHeader(new Uint8Array())).toBe(false);
  });

  it('finds byte sequences', () => {
    expect(containsBytes(bytes(`xx${PLAINTEXT_MARKER}yy`), bytes(PLAINTEXT_MARKER))).toBe(true);
    expect(containsBytes(bytes('MEMENTO-DEVICE-CHECK'), bytes(PLAINTEXT_MARKER))).toBe(false);
  });

  it('compares bytes exactly', () => {
    expect(bytesEqual(bytes('abc'), bytes('abc'))).toBe(true);
    expect(bytesEqual(bytes('abc'), bytes('abd'))).toBe(false);
    expect(bytesEqual(bytes('abc'), bytes('ab'))).toBe(false);
  });

  it('passes only a non-empty, all-passing result list', () => {
    const r = (ok: boolean): DeviceCheckResult => ({ id: 'x', gate: 'G1', ok, detail: '' });
    expect(allPassed([])).toBe(false);
    expect(allPassed([r(true), r(true)])).toBe(true);
    expect(allPassed([r(true), r(false)])).toBe(false);
  });
});

/**
 * A Node environment on plain SQLite files. It cannot encrypt, so it shows that the suite
 * reports missing encryption instead of passing. Real SQLCipher runs only on device.
 */
function plainSqliteEnv(dir: string, options: { reportsCipher: boolean }) {
  const name = 'memento-device-check.db';
  const open = new Set<ClosableSqlDatabase>();
  let storedKey: string | null = null;
  const removals = { files: 0, key: 0 };
  const full = (fileName: string) => path.join(dir, fileName);

  const files: DatabaseFiles = {
    exists: async () => fs.existsSync(full(name)) && fs.statSync(full(name)).size > 0,
    quarantine: async (stamp) => {
      const moved: string[] = [];
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        if (!fs.existsSync(full(`${name}${suffix}`))) continue;
        const target = `${name}${suffix}.quarantine-${stamp}`;
        fs.renameSync(full(`${name}${suffix}`), full(target));
        moved.push(target);
      }
      return moved;
    },
  };

  const env: DeviceCheckEnv = {
    databaseName: name,
    files,
    connect: async (fileName) => {
      const db = openNodeSqlDatabase(full(fileName));
      const connection: ClosableSqlDatabase = {
        ...db,
        // Plain SQLite ignores unknown pragmas, as an unencrypted build would.
        exec: (sql) => (/^PRAGMA key/.test(sql) ? Promise.resolve() : db.exec(sql)),
        get: <T>(sql: string, params?: readonly (string | number | null)[]) =>
          /^PRAGMA cipher_version/.test(sql)
            ? Promise.resolve(
                (options.reportsCipher ? { cipher_version: 'fake' } : undefined) as T | undefined,
              )
            : db.get<T>(sql, params),
        close: async () => {
          open.delete(connection);
          db.close();
        },
      };
      open.add(connection);
      return connection;
    },
    secureKeyStore: {
      get: async () => storedKey,
      set: async (key) => {
        storedKey = key;
      },
      remove: async () => {
        removals.key++;
        storedKey = null;
      },
    },
    readFile: async (fileName) =>
      fs.existsSync(full(fileName)) ? Uint8Array.from(fs.readFileSync(full(fileName))) : null,
    replaceFile: async (from, to) => {
      if (fs.existsSync(full(from))) fs.copyFileSync(full(from), full(to));
    },
    removeCheckFiles: async () => {
      removals.files++;
      for (const f of fs.readdirSync(dir)) if (f.startsWith(name)) fs.rmSync(full(f));
    },
    randomBytes: (n) => Uint8Array.from(randomBytes(n)),
    now: () => new Date('2026-11-09T10:00:00.000Z'),
  };
  return { env, open, removals, storedKey: () => storedKey };
}

describe('runDeviceChecks', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-device-check-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const byId = (results: DeviceCheckResult[]) =>
    Object.fromEntries(results.map((r) => [r.id, r.ok]));

  it('stops after state A when SQLCipher is unavailable (fail closed)', async () => {
    const { env, open, removals } = plainSqliteEnv(dir, { reportsCipher: false });

    const results = await runDeviceChecks(env);

    expect(results).toEqual([
      expect.objectContaining({
        id: 'state-a-first-run',
        ok: false,
        detail: expect.stringContaining('cipher-unavailable'),
      }),
    ]);
    expect(open.size).toBe(0);
    expect(removals).toEqual({ files: 2, key: 2 });
  });

  it('reports a build that claims a cipher but stores plaintext as failing', async () => {
    const { env, open, storedKey } = plainSqliteEnv(dir, { reportsCipher: true });

    const results = await runDeviceChecks(env);
    const ok = byId(results);

    // Behavior that does not depend on encryption still passes on plain SQLite...
    for (const id of [
      'state-a-first-run',
      'cipher-version',
      'key-stored-and-read-back',
      'connection-pragmas',
      'migrations-applied',
      'built-ins-seeded',
      'transaction-rollback',
      'transaction-commit',
      'foreign-keys-enforced',
      'inbox-rule-enforced',
      'settings-saved',
      'state-b-reopen',
    ]) {
      expect([id, ok[id]]).toEqual([id, true]);
    }
    // ...but every encryption check fails, so the run cannot pass.
    for (const id of [
      'encrypted-at-rest',
      'no-key-rejected',
      'wrong-key-rejected',
      'state-d-wrong-key',
      'state-d-wal-recoverable',
    ]) {
      expect([id, ok[id]]).toEqual([id, false]);
    }
    expect(allPassed(results)).toBe(false);

    // Cleanup: no open connections, no check files, no check key.
    expect(open.size).toBe(0);
    expect(fs.readdirSync(dir)).toEqual([]);
    expect(storedKey()).toBeNull();
  });

  it('never reports key values', async () => {
    const { env } = plainSqliteEnv(dir, { reportsCipher: true });
    const keys: string[] = [];
    const set = env.secureKeyStore.set;
    env.secureKeyStore.set = async (key) => {
      keys.push(key);
      await set(key);
    };

    const text = JSON.stringify(await runDeviceChecks(env));

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(text).not.toContain(key);
  });
});
