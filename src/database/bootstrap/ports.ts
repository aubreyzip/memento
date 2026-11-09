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
   * O-051: if a non-empty `-wal` sidecar exists, copies the database file and its sidecars to
   * `<file>.pre-open-<stamp>` before the key check opens them. Opening a WAL database with a
   * wrong key can checkpoint the WAL into the main file when the connection closes, so this
   * copy is the only byte-for-byte original. Returns the copied names (empty if nothing to copy).
   */
  snapshot(stamp: string): Promise<string[]>;
  /** Deletes the pre-open copies made with this stamp (they are Memento's copies, not data). */
  discardSnapshot(stamp: string): Promise<void>;
  /**
   * Moves the database file and any -wal/-shm/-journal sidecars to
   * `<file>.quarantine-<stamp>` in the same directory. Never deletes. If a pre-open snapshot
   * with this stamp exists, the snapshot (the untouched originals) takes the
   * `.quarantine-<stamp>` names and the files the key check opened are kept as
   * `<file>.quarantine-<stamp>.after-key-check`. Returns the new names.
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
