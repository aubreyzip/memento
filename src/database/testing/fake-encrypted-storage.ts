import type {
  DatabaseFiles,
  DatabaseKeyStore,
  DatabaseStartDependencies,
} from '../bootstrap/ports';
import type { ClosableSqlDatabase } from '../connection/sql-database';

import { openNodeSqlDatabase, type NodeSqlDatabase } from './node-sql-database';

/**
 * Test double for the device: one database "file", a key store, and a SQLCipher stand-in.
 * It models only the behavior the startup state machine relies on:
 * - `PRAGMA cipher_version` returns a row only when the cipher is available;
 * - the first write to an empty file binds the key used; later opens with any other key (or no
 *   key) fail with "file is not a database";
 * - quarantine moves the file aside without deleting it.
 * Real SQLCipher behavior is verified on device (gates G1–G4), not here.
 */
type FakeFile = { db: NodeSqlDatabase; boundKey: string | null; hasData: boolean };

export class FakeEncryptedStorage {
  cipherAvailable = true;
  storedKey: string | null = null;
  keyStoreReadError: Error | null = null;
  keyStoreWriteError: Error | null = null;
  file: FakeFile | null = null;
  readonly quarantined: { names: string[]; file: FakeFile }[] = [];
  readonly openConnections = new Set<ClosableSqlDatabase>();
  /** Every PRAGMA statement executed, for assertions (key values are test data). */
  readonly pragmas: string[] = [];

  /** Simulates an empty (0-byte) file left by an earlier open that never wrote. */
  createEmptyFile(): void {
    this.file = { db: openNodeSqlDatabase(), boundKey: null, hasData: false };
  }

  readonly keyStore: DatabaseKeyStore = {
    get: async () => {
      if (this.keyStoreReadError) throw this.keyStoreReadError;
      return this.storedKey;
    },
    set: async (key) => {
      if (this.keyStoreWriteError) throw this.keyStoreWriteError;
      this.storedKey = key;
    },
  };

  readonly files: DatabaseFiles = {
    exists: async () => this.file !== null && this.file.hasData,
    quarantine: async (stamp) => {
      if (this.openConnections.size > 0) throw new Error('Quarantine with an open connection');
      if (!this.file) return [];
      const names = [`memento.db.quarantine-${stamp}`];
      this.quarantined.push({ names, file: this.file });
      this.file = null;
      return names;
    },
  };

  connect = async (): Promise<ClosableSqlDatabase> => {
    this.file ??= { db: openNodeSqlDatabase(), boundKey: null, hasData: false };
    const file = this.file;
    let sessionKey: string | null = null;

    const guard = (sql: string) => {
      const trimmed = sql.trim();
      if (/^PRAGMA cipher_version/i.test(trimmed)) return;
      if (file.hasData && file.boundKey !== sessionKey) {
        throw new Error('file is not a database');
      }
    };
    const markWrite = () => {
      if (!file.hasData) {
        file.hasData = true;
        file.boundKey = sessionKey;
      }
    };

    const connection: ClosableSqlDatabase = {
      exec: async (sql) => {
        const key = /^PRAGMA key = "x'([0-9a-f]{64})'"$/.exec(sql.trim());
        if (/^PRAGMA/i.test(sql.trim())) this.pragmas.push(sql.trim());
        if (key) {
          sessionKey = key[1];
          return;
        }
        guard(sql);
        await file.db.exec(sql);
        if (!/^PRAGMA/i.test(sql.trim())) markWrite();
      },
      run: async (sql, params) => {
        guard(sql);
        const result = await file.db.run(sql, params);
        markWrite();
        return result;
      },
      all: async (sql, params) => {
        guard(sql);
        return file.db.all(sql, params);
      },
      get: async <T>(sql: string, params?: readonly (string | number | null)[]) => {
        if (/^PRAGMA cipher_version/i.test(sql.trim())) {
          return (this.cipherAvailable ? { cipher_version: '4.x (test double)' } : undefined) as
            T | undefined;
        }
        guard(sql);
        return file.db.get<T>(sql, params);
      },
      transaction: async (task) => {
        guard('BEGIN');
        return file.db.transaction(task);
      },
      close: async () => {
        this.openConnections.delete(connection);
      },
    };
    this.openConnections.add(connection);
    return connection;
  };

  dependencies(randomBytes?: (n: number) => Uint8Array): DatabaseStartDependencies {
    let counter = 0;
    return {
      files: this.files,
      keyStore: this.keyStore,
      connect: this.connect,
      randomBytes:
        randomBytes ??
        ((n) => Uint8Array.from({ length: n }, (_, i) => (i + 1 + counter++ * 7) % 256)),
      now: () => new Date('2026-11-08T12:00:00.000Z'),
    };
  }
}
