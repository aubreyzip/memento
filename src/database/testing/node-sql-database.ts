import Database from 'better-sqlite3';

import type { SqlDatabase, SqlValue } from '../connection/sql-database';

/**
 * Test-only SqlDatabase on better-sqlite3 (O-047). Never imported by app code, so it is not
 * bundled. Plain SQLite, not SQLCipher: encryption behavior is verified on device (gates G1–G4).
 */
export type NodeSqlDatabase = SqlDatabase & { close(): void; raw: Database.Database };

export function openNodeSqlDatabase(filename = ':memory:'): NodeSqlDatabase {
  const db = new Database(filename);
  // Same connection setup the app applies after keying (SDD §8.1 step 5).
  db.pragma('foreign_keys = ON');

  return {
    raw: db,
    close: () => db.close(),
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params: readonly SqlValue[] = []) {
      return { changes: db.prepare(sql).run(...params).changes };
    },
    async all<T>(sql: string, params: readonly SqlValue[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: readonly SqlValue[] = []) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    async transaction<T>(task: () => Promise<T>) {
      db.exec('BEGIN');
      try {
        const result = await task();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
