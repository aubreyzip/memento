import {
  generateDatabaseKey,
  isValidDatabaseKey,
  keyPragma,
} from '@/database/bootstrap/database-key';
import { openEncryptedDatabase } from '@/database/bootstrap/open-encrypted-database';
import type {
  DatabaseFiles,
  DatabaseKeyStore,
  DatabaseStartDependencies,
} from '@/database/bootstrap/ports';
import type { ClosableSqlDatabase } from '@/database/connection/sql-database';
import { MIGRATIONS } from '@/database/migrations';
import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '@/domain/catalog';
import { SqliteSettingsRepository } from '@/repositories/sqlite-settings-repository';

/**
 * On-device integration checks (O-017 part 3; gates G1–G4 in PHASE_0_REPORT §7).
 *
 * They drive the real startup state machine, SQLCipher, SecureStore, and file system against a
 * check-only database file and key entry, never the app's own `memento.db` or key. All data is
 * synthetic. Results never include key values.
 */
export type DeviceCheckResult = { id: string; gate: string; ok: boolean; detail: string };

export type DeviceCheckEnv = {
  /** File name of the check-only database (not the app database). */
  databaseName: string;
  files: DatabaseFiles;
  /** Opens a database file in the database directory; not keyed. */
  connect(fileName: string): Promise<ClosableSqlDatabase>;
  /** The real secure key storage, under a check-only entry name. */
  secureKeyStore: DatabaseKeyStore & { remove(): Promise<void> };
  /** Reads a file in the database directory, or null if it does not exist. */
  readFile(fileName: string): Promise<Uint8Array | null>;
  /** Copies a file in the database directory, replacing the target if it exists. */
  replaceFile(from: string, to: string): Promise<void>;
  /** Deletes every check-only file (the check database, its sidecars, its quarantined copies). */
  removeCheckFiles(): Promise<void>;
  randomBytes: (count: number) => Uint8Array;
  now: () => Date;
};

/** Synthetic text whose absence from the raw file shows the contents are encrypted. */
export const PLAINTEXT_MARKER = 'MEMENTO-DEVICE-CHECK-PLAINTEXT-MARKER';
const SQLITE_HEADER = 'SQLite format 3\u0000';
const PERSON_TYPE_ID = BUILT_IN_COLLECTION_TYPES[0].id;

const ascii = (text: string) => Uint8Array.from(text, (ch) => ch.charCodeAt(0));

export function hasPlainSqliteHeader(bytes: Uint8Array): boolean {
  const header = ascii(SQLITE_HEADER);
  return bytes.length >= header.length && header.every((b, i) => bytes[i] === b);
}

export function containsBytes(haystack: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

export const allPassed = (results: readonly DeviceCheckResult[]) =>
  results.length > 0 && results.every((r) => r.ok);

class CheckFailed extends Error {}

/** Matches the quarantined copy of one file (main, `-wal`, ...) by its suffix. */
const isQuarantinedFile = (suffix: string) => (name: string) =>
  new RegExp(`\\.db${suffix}\\.quarantine-[^.]+$`).test(name);

function expectThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CheckFailed(message);
}

async function expectRejects(task: () => Promise<unknown>, message: string): Promise<string> {
  try {
    await task();
  } catch (error) {
    return `rejected: ${error instanceof Error ? error.message : String(error)}`;
  }
  throw new CheckFailed(message);
}

function memoryKeyStore(initial: string | null): DatabaseKeyStore {
  let value = initial;
  return {
    get: async () => value,
    set: async (key) => {
      value = key;
    },
  };
}

async function quietly(task: () => Promise<unknown>) {
  try {
    await task();
  } catch {
    // Cleanup is best effort.
  }
}

/** Runs every check in order. Never throws; a failed step is reported, not raised. */
export async function runDeviceChecks(env: DeviceCheckEnv): Promise<DeviceCheckResult[]> {
  const results: DeviceCheckResult[] = [];
  const open = new Set<ClosableSqlDatabase>();

  const check = async (id: string, gate: string, task: () => Promise<string | void>) => {
    try {
      results.push({ id, gate, ok: true, detail: (await task()) ?? '' });
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({ id, gate, ok: false, detail });
      return false;
    }
  };

  const track = async (fileName: string) => {
    const db = await env.connect(fileName);
    open.add(db);
    return db;
  };
  const close = async (db: ClosableSqlDatabase) => {
    open.delete(db);
    await db.close();
  };

  const deps = (keyStore: DatabaseKeyStore): DatabaseStartDependencies => ({
    files: env.files,
    keyStore,
    connect: () => track(env.databaseName),
    randomBytes: env.randomBytes,
    now: env.now,
  });

  const startReady = async (keyStore: DatabaseKeyStore, firstRun: boolean) => {
    const result = await openEncryptedDatabase(deps(keyStore));
    if (result.status !== 'ready') {
      throw new CheckFailed(`expected ready, got ${result.status} (${result.reason})`);
    }
    // The state machine closes failed connections itself; forget the ones it closed.
    for (const db of open) if (db !== result.db) open.delete(db);
    expectThat(result.firstRun === firstRun, `expected firstRun=${firstRun}`);
    return result.db;
  };

  const startRecovery = async (keyStore: DatabaseKeyStore) => {
    const result = await openEncryptedDatabase(deps(keyStore));
    open.clear(); // Recovery closes its connection before quarantining.
    if (result.status !== 'recovery') {
      if (result.status === 'ready') await quietly(() => result.db.close());
      throw new CheckFailed(`expected recovery, got ${result.status}`);
    }
    return result;
  };

  const newId = () => {
    // A v4-shaped ID from the injected random source (outside the reserved built-in namespace).
    const h = generateDatabaseKey(env.randomBytes);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };

  try {
    await env.removeCheckFiles();
    await env.secureKeyStore.remove();

    // --- State A: no file, no key. Real SecureStore entry, real SQLCipher. ---
    let created: ClosableSqlDatabase | undefined;
    const started = await check('state-a-first-run', 'G3', async () => {
      created = await startReady(env.secureKeyStore, true);
      return 'ready; new database and key created';
    });
    if (!started || !created) return results;
    const db = created;

    await check('cipher-version', 'G1', async () => {
      const row = await db.get<{ cipher_version?: string }>('PRAGMA cipher_version');
      expectThat(row?.cipher_version, 'PRAGMA cipher_version returned nothing');
      return `SQLCipher ${row.cipher_version}`;
    });

    await check('key-stored-and-read-back', 'G4', async () => {
      expectThat(isValidDatabaseKey(await env.secureKeyStore.get()), 'no valid key stored');
      return '256-bit key stored and read back without user authentication (value not shown)';
    });

    await check('connection-pragmas', 'G2', async () => {
      const fk = await db.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
      const jm = await db.get<{ journal_mode: string }>('PRAGMA journal_mode');
      expectThat(fk?.foreign_keys === 1, `foreign_keys=${fk?.foreign_keys}`);
      expectThat(jm?.journal_mode === 'wal', `journal_mode=${jm?.journal_mode}`);
      return 'foreign_keys=1, journal_mode=wal on the keyed connection';
    });

    await check('migrations-applied', 'G2', async () => {
      const row = await db.get<{ user_version: number }>('PRAGMA user_version');
      expectThat(row?.user_version === MIGRATIONS.length, `user_version=${row?.user_version}`);
      return `user_version=${row?.user_version}`;
    });

    await check('built-ins-seeded', 'G2', async () => {
      const types = await db.get<{ n: number }>(
        'SELECT count(*) AS n FROM collection_types WHERE is_system = 1',
      );
      const cats = await db.get<{ n: number }>(
        'SELECT count(*) AS n FROM categories WHERE is_system = 1',
      );
      expectThat(types?.n === BUILT_IN_COLLECTION_TYPES.length, `collection types=${types?.n}`);
      expectThat(cats?.n === BUILT_IN_CATEGORIES.length, `categories=${cats?.n}`);
      return `${types?.n} collection types, ${cats?.n} categories`;
    });

    const stamp = env.now().toISOString();
    const insertCollection = (id: string, typeId: string, name: string) =>
      db.run(
        'INSERT INTO collections (id, collection_type_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, typeId, name, stamp, stamp],
      );
    const countCollection = async (id: string) =>
      (await db.get<{ n: number }>('SELECT count(*) AS n FROM collections WHERE id = ?', [id]))
        ?.n ?? -1;

    await check('transaction-rollback', 'G2', async () => {
      const id = newId();
      await expectRejects(
        () =>
          db.transaction(async () => {
            await insertCollection(id, PERSON_TYPE_ID, 'Rolled back');
            throw new Error('synthetic failure');
          }),
        'the transaction did not propagate the failure',
      );
      expectThat((await countCollection(id)) === 0, 'row survived a rolled-back transaction');
      return 'rolled back on error (same keyed connection)';
    });

    const collectionId = newId();
    await check('transaction-commit', 'G2', async () => {
      await db.transaction(() => insertCollection(collectionId, PERSON_TYPE_ID, PLAINTEXT_MARKER));
      expectThat((await countCollection(collectionId)) === 1, 'committed row missing');
      return 'committed row visible';
    });

    await check('foreign-keys-enforced', 'G2', () =>
      expectRejects(
        () => insertCollection(newId(), newId(), 'Orphan'),
        'an insert with a missing collection type was accepted',
      ),
    );

    await check('inbox-rule-enforced', 'G2', () =>
      expectRejects(
        () =>
          db.run(
            'INSERT INTO entries (id, collection_id, category_id, title, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?)',
            [newId(), collectionId, 'Half assigned', stamp, stamp],
          ),
        'a half-assigned entry was accepted',
      ),
    );

    await check('settings-saved', 'G3', async () => {
      await new SqliteSettingsRepository(db).set('appearance', 'dark');
      return 'appearance=dark saved';
    });

    await close(db);

    await check('encrypted-at-rest', 'G1', async () => {
      const main = await env.readFile(env.databaseName);
      expectThat(main && main.length > 0, 'database file missing or empty');
      expectThat(!hasPlainSqliteHeader(main), 'the file starts with the plain SQLite header');
      const marker = ascii(PLAINTEXT_MARKER);
      for (const suffix of ['', '-wal']) {
        const bytes = await env.readFile(`${env.databaseName}${suffix}`);
        expectThat(!bytes || !containsBytes(bytes, marker), `plaintext found in file${suffix}`);
      }
      return `${main.length} bytes; no SQLite header; synthetic marker not readable`;
    });

    // --- State B: file and the right key. ---
    await check('state-b-reopen', 'G3', async () => {
      const reopened = await startReady(env.secureKeyStore, false);
      const appearance = await new SqliteSettingsRepository(reopened).get('appearance');
      await close(reopened);
      expectThat(appearance === 'dark', `appearance=${appearance}`);
      return 'reopened; saved setting intact';
    });

    await check('no-key-rejected', 'G1', async () => {
      const raw = await track(env.databaseName);
      try {
        return await expectRejects(
          () => raw.get('SELECT count(*) AS n FROM sqlite_master'),
          'a read without a key succeeded',
        );
      } finally {
        await close(raw);
      }
    });

    await check('wrong-key-rejected', 'G1', async () => {
      const raw = await track(env.databaseName);
      try {
        await raw.exec(keyPragma(generateDatabaseKey(env.randomBytes)));
        return await expectRejects(
          () => raw.get('SELECT count(*) AS n FROM sqlite_master'),
          'a read with a wrong key succeeded',
        );
      } finally {
        await close(raw);
      }
    });

    // --- State D: file and a different key. Quarantined, never deleted. ---
    const before = await env.readFile(env.databaseName);
    let quarantinedMain = '';
    await check('state-d-wrong-key', 'G3', async () => {
      const result = await startRecovery(memoryKeyStore(generateDatabaseKey(env.randomBytes)));
      expectThat(result.reason === 'key-mismatch', `reason=${result.reason}`);
      quarantinedMain = result.quarantined.find(isQuarantinedFile('')) ?? '';
      expectThat(quarantinedMain, 'the main file is not in the quarantine list');
      expectThat(!(await env.files.exists()), 'a database is still at the original name');
      return `recovery (key-mismatch); moved: ${result.quarantined.join(', ')}`;
    });

    await check('quarantine-preserves-bytes', 'G3', async () => {
      const after = quarantinedMain ? await env.readFile(quarantinedMain) : null;
      expectThat(before && after && bytesEqual(before, after), 'quarantined bytes differ');
      return `${after.length} bytes identical after the move`;
    });

    await check('quarantine-recoverable-with-original-key', 'G3', async () => {
      expectThat(quarantinedMain, 'no quarantined file');
      const raw = await track(quarantinedMain);
      try {
        await raw.exec(keyPragma((await env.secureKeyStore.get()) ?? ''));
        const appearance = await new SqliteSettingsRepository(raw).get('appearance');
        expectThat(appearance === 'dark', `appearance=${appearance}`);
        return 'the quarantined file opens with the original key; data intact';
      } finally {
        await close(raw);
      }
    });

    // --- State E: key present, no file. ---
    await check('state-e-key-without-file', 'G3', async () => {
      await close(await startReady(env.secureKeyStore, true));
      return 'new database created with the existing key';
    });

    // --- State C: file present, no key. ---
    await check('state-c-no-key', 'G3', async () => {
      const result = await startRecovery(memoryKeyStore(null));
      expectThat(result.reason === 'key-missing', `reason=${result.reason}`);
      expectThat(result.quarantined.length > 0, 'nothing quarantined');
      expectThat(!(await env.files.exists()), 'a database is still at the original name');
      return `recovery (key-missing); moved: ${result.quarantined.join(', ')}`;
    });

    // --- "Start fresh": the gate retries startup, which creates a new database and key. ---
    await check('start-fresh-after-recovery', 'G3', async () => {
      const fresh = memoryKeyStore(null);
      await close(await startReady(fresh, true));
      expectThat(isValidDatabaseKey(await fresh.get()), 'no new key stored');
      return 'new database and key; quarantined files kept';
    });

    // --- O-051: state D with a leftover, uncheckpointed WAL (as after the app is killed). ---
    await check('state-d-wal-recoverable', 'G3', async () => {
      await env.removeCheckFiles();
      const name = env.databaseName;
      const staged = `${name}.staged`;
      const sidecars = ['', '-wal', '-shm'];
      const key = memoryKeyStore(generateDatabaseKey(env.randomBytes));
      const writer = await startReady(key, true);
      try {
        await writer.exec('PRAGMA wal_autocheckpoint = 0');
        await new SqliteSettingsRepository(writer).set('appearance', 'light');
        // Copy the live files while the writer is open: a crash-consistent state with the latest
        // change only in the WAL. Closing the writer checkpoints, so the copy is restored after.
        for (const s of sidecars) await env.replaceFile(`${name}${s}`, `${staged}${s}`);
      } finally {
        await close(writer);
      }
      for (const s of sidecars) await env.replaceFile(`${staged}${s}`, `${name}${s}`);
      const originalMain = await env.readFile(name);
      const originalWal = await env.readFile(`${name}-wal`);
      expectThat(originalMain && originalWal && originalWal.length > 0, 'setup: no WAL left over');

      const result = await startRecovery(memoryKeyStore(generateDatabaseKey(env.randomBytes)));
      expectThat(result.reason === 'key-mismatch', `reason=${result.reason}`);
      const main = result.quarantined.find(isQuarantinedFile(''));
      expectThat(main, `main file missing from: ${result.quarantined.join(', ')}`);
      // The key check may have checkpointed the WAL into the main file (O-051 option c), so the
      // bytes can differ; what matters is that nothing is lost.
      const wal = result.quarantined.find(isQuarantinedFile('-wal'));

      // Recoverable: under paired names the quarantined files open with the original key,
      // including the change that existed only in the WAL.
      await env.replaceFile(main, `${name}.recovered`);
      if (wal) await env.replaceFile(wal, `${name}.recovered-wal`);
      const raw = await track(`${name}.recovered`);
      try {
        await raw.exec(keyPragma((await key.get()) ?? ''));
        const appearance = await new SqliteSettingsRepository(raw).get('appearance');
        expectThat(appearance === 'light', `appearance=${appearance}`);
      } finally {
        await close(raw);
      }
      return `quarantined: ${result.quarantined.join(', ')}; WAL-only change recoverable with the original key`;
    });

    return results;
  } catch (error) {
    results.push({
      id: 'runner',
      gate: '-',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    return results;
  } finally {
    for (const db of open) await quietly(() => db.close());
    await quietly(() => env.removeCheckFiles());
    await quietly(() => env.secureKeyStore.remove());
  }
}
