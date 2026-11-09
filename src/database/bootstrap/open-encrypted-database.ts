import type { ClosableSqlDatabase } from '../connection/sql-database';
import { initializeSchema } from '../initialize-schema';
import { DatabaseNewerThanAppError } from '../migrations/run-migrations';

import { generateDatabaseKey, isValidDatabaseKey, keyPragma } from './database-key';
import type { DatabaseStartDependencies } from './ports';

export type DatabaseStartResult =
  | { status: 'ready'; db: ClosableSqlDatabase; firstRun: boolean }
  | {
      /** The existing database cannot be opened with this device's key. It was quarantined. */
      status: 'recovery';
      reason: 'key-missing' | 'key-mismatch';
      quarantined: string[];
    }
  | {
      /** Nothing was created, keyed, quarantined, or modified. */
      status: 'error';
      reason:
        | 'cipher-unavailable'
        | 'key-store-unavailable'
        | 'key-store-failed'
        | 'newer-than-app'
        | 'migration-failed'
        | 'open-failed';
    };

const quarantineStamp = (now: Date) => now.toISOString().replace(/[:.]/g, '-');

async function safeClose(db: ClosableSqlDatabase): Promise<void> {
  try {
    await db.close();
  } catch {
    // Closing is best effort; the caller's result does not depend on it.
  }
}

/**
 * Opens the encrypted database following SDD §8.1 / §8.1.1 (O-019, O-036).
 *
 * States: A no file + no key → create; B file + key opens → normal; C file + no key →
 * quarantine; D file + wrong key → quarantine; E key + no file → create with the existing key.
 *
 * Guarantees:
 * - SQLCipher availability is checked first; without it nothing is keyed or written (fail closed).
 * - An existing database file is never deleted, overwritten, or recreated; unreadable files are
 *   moved aside, never removed.
 * - A key-storage read error is not treated as a missing key (no quarantine on a locked device).
 * - The key is stored and read back before a new database is created with it.
 * - With a wrong key, closing the key-check connection may checkpoint a leftover WAL into the
 *   main file (O-051 option c). The quarantined file is then not byte-identical, but its content
 *   is intact and opens with the original key.
 */
export async function openEncryptedDatabase(
  deps: DatabaseStartDependencies,
): Promise<DatabaseStartResult> {
  const stamp = quarantineStamp(deps.now());
  const exists = await deps.files.exists();

  let storedKey: string | null;
  try {
    storedKey = await deps.keyStore.get();
  } catch {
    return { status: 'error', reason: 'key-store-unavailable' };
  }
  const key = isValidDatabaseKey(storedKey) ? storedKey : null;

  if (exists && key === null) {
    // State C (or a corrupt stored key, treated as a mismatch). Never open, so nothing is written.
    const quarantined = await deps.files.quarantine(stamp);
    return {
      status: 'recovery',
      reason: storedKey === null ? 'key-missing' : 'key-mismatch',
      quarantined,
    };
  }

  return openWithKey(deps, exists, key, stamp);
}

async function openWithKey(
  deps: DatabaseStartDependencies,
  exists: boolean,
  key: string | null,
  stamp: string,
): Promise<DatabaseStartResult> {
  let db: ClosableSqlDatabase;
  try {
    db = await deps.connect();
  } catch {
    return { status: 'error', reason: 'open-failed' };
  }

  try {
    const cipher = await db.get<{ cipher_version?: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) {
      await safeClose(db);
      return { status: 'error', reason: 'cipher-unavailable' };
    }

    let activeKey = key;
    if (!exists && activeKey === null) {
      // State A. A corrupt stored key with no database is replaced: there is no data to protect.
      activeKey = generateDatabaseKey(deps.randomBytes);
      try {
        await deps.keyStore.set(activeKey);
        if ((await deps.keyStore.get()) !== activeKey) throw new Error('Key read-back mismatch');
      } catch {
        await safeClose(db);
        return { status: 'error', reason: 'key-store-failed' };
      }
    }

    await db.exec(keyPragma(activeKey!));

    try {
      // Fails with "file is not a database" when the key does not match.
      await db.get('SELECT count(*) AS n FROM sqlite_master');
    } catch {
      await safeClose(db);
      if (!exists) return { status: 'error', reason: 'open-failed' };
      // State D.
      const quarantined = await deps.files.quarantine(stamp);
      return { status: 'recovery', reason: 'key-mismatch', quarantined };
    }

    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('PRAGMA journal_mode = WAL');

    try {
      await initializeSchema(db, { now: () => deps.now().toISOString() });
    } catch (error) {
      await safeClose(db);
      return {
        status: 'error',
        reason: error instanceof DatabaseNewerThanAppError ? 'newer-than-app' : 'migration-failed',
      };
    }

    return { status: 'ready', db, firstRun: !exists };
  } catch {
    await safeClose(db);
    return { status: 'error', reason: 'open-failed' };
  }
}
