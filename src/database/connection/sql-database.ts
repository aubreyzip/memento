/**
 * Minimal database interface used by migrations, seeds, and repositories (SDD §8, O-016).
 * Implemented by an expo-sqlite adapter on device (Phase 1 slice 5b) and by a better-sqlite3
 * adapter in Node tests (O-017, O-047), so the same SQL runs in both.
 *
 * All statements with values MUST use `?` placeholders and `params`; never concatenate input.
 */
export type SqlValue = string | number | null;

export interface SqlDatabase {
  /** Runs one or more statements without parameters (migration scripts, pragmas). */
  exec(sql: string): Promise<void>;
  /** Runs one parameterized statement and returns the number of changed rows. */
  run(sql: string, params?: readonly SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: readonly SqlValue[]): Promise<T | undefined>;
  /**
   * Runs `task` in a transaction on this same connection; rolls back if it throws.
   * On device this maps to `withTransactionAsync()`, never `withExclusiveTransactionAsync()`,
   * which opens a separate, unkeyed connection (SDD §8.1).
   */
  transaction<T>(task: () => Promise<T>): Promise<T>;
}

/** A connection the app owns and must close (before quarantine, O-019). */
export type ClosableSqlDatabase = SqlDatabase & { close(): Promise<void> };
