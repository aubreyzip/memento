import type { ClosableSqlDatabase } from '../connection/sql-database';

/** Secure storage for the database key (SecureStore on device, O-019). */
export interface DatabaseKeyStore {
  /** Returns the stored key, or null if none is stored. Throws if storage is unavailable. */
  get(): Promise<string | null>;
  set(key: string): Promise<void>;
}

/** File operations on the database and its sidecars (Expo FileSystem on device). */
export interface DatabaseFiles {
  /** True only if the database file exists and is non-empty (an empty file holds no data). */
  exists(): Promise<boolean>;
  /**
   * Moves the database file and any -wal/-shm/-journal sidecars to
   * `<name>.quarantine-<stamp>` in the same directory. Never deletes. Returns the new names.
   */
  quarantine(stamp: string): Promise<string[]>;
}

export type DatabaseStartDependencies = {
  files: DatabaseFiles;
  keyStore: DatabaseKeyStore;
  /** Opens (creating if needed) the database file; the connection is not keyed yet. */
  connect: () => Promise<ClosableSqlDatabase>;
  randomBytes: (count: number) => Uint8Array;
  now: () => Date;
};
