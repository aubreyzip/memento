// Minimal adapter + migration runner. The same .sql files are intended to run unchanged on expo-sqlite.
import initSqlJs from 'sql.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const SQL = await initSqlJs();

export function openMemoryDb() {
  const db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => db.run(sql, params),
    all: (sql, params = []) => {
      const st = db.prepare(sql); st.bind(params);
      const rows = []; while (st.step()) rows.push(st.getAsObject());
      st.free(); return rows;
    },
    get(sql, params = []) { return this.all(sql, params)[0]; },
    raw: db,
  };
}

export function listMigrations() {
  return readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()
    .map((f) => ({ version: Number(f.slice(0, 4)), sql: readFileSync(join(MIGRATIONS_DIR, f), 'utf8') }));
}

// Each migration runs in its own transaction and bumps PRAGMA user_version inside it.
export function migrate(db, upTo = Infinity) {
  const current = db.get('PRAGMA user_version').user_version;
  for (const m of listMigrations()) {
    if (m.version <= current || m.version > upTo) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return db.get('PRAGMA user_version').user_version;
}
