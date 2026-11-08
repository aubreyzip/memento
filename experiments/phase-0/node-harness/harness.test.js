import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openMemoryDb, migrate } from './db.js';

const PERSON = '4d454d30-0000-8000-8000-000000000001';
const GIFTS = '4d454d30-0000-8000-8001-000000000001';

function seeded() {
  const db = openMemoryDb();
  migrate(db);
  db.run('INSERT INTO collections (id, collection_type_id, name) VALUES (?, ?, ?)', ['c1', PERSON, 'Synthetic person']);
  db.run('INSERT INTO entries (id, collection_id, category_id, title) VALUES (?, ?, ?, ?)', ['e1', 'c1', GIFTS, 'Synthetic gift']);
  db.run('INSERT INTO entry_links (id, entry_id, url) VALUES (?, ?, ?)', ['l1', 'e1', 'https://example.com/a']);
  db.run('INSERT INTO entry_links (id, entry_id, url) VALUES (?, ?, ?)', ['l2', 'e1', 'https://example.com/b']);
  return db;
}

test('migration runner: fresh DB reaches latest user_version; re-run is a no-op', () => {
  const db = openMemoryDb();
  assert.equal(migrate(db), 2);
  assert.equal(migrate(db), 2);
  assert.equal(db.get('SELECT COUNT(*) n FROM categories').n, 2);
});

test('migration runner: failing migration rolls back and leaves user_version unchanged', () => {
  const db = openMemoryDb();
  migrate(db, 1);
  db.exec("INSERT INTO collection_types (id, key, is_system) VALUES ('x', 'PERSON', 0)"); // makes 0002 violate UNIQUE(key)
  assert.throws(() => migrate(db));
  assert.equal(db.get('PRAGMA user_version').user_version, 1);
  assert.equal(db.get("SELECT COUNT(*) n FROM collection_types WHERE key='SPACE'").n, 0);
});

test('Inbox invariant: half-assigned entries are rejected by SQLite', () => {
  const db = seeded();
  db.run('INSERT INTO entries (id, title) VALUES (?, ?)', ['inbox1', 'Unsorted']);
  assert.throws(() => db.run('INSERT INTO entries (id, collection_id, title) VALUES (?, ?, ?)', ['bad', 'c1', 'x']), /CHECK/);
  assert.throws(() => db.run('INSERT INTO entries (id, category_id, title) VALUES (?, ?, ?)', ['bad2', GIFTS, 'x']), /CHECK/);
});

const REBUILD_ENTRIES = `
  CREATE TABLE entries_new (
    id TEXT PRIMARY KEY NOT NULL,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (length(title) <= 160),
    CHECK ((collection_id IS NULL AND category_id IS NULL) OR (collection_id IS NOT NULL AND category_id IS NOT NULL))
  );
  INSERT INTO entries_new (id, collection_id, category_id, title) SELECT id, collection_id, category_id, title FROM entries;
  DROP TABLE entries;
  ALTER TABLE entries_new RENAME TO entries;`;

test('R-34 hazard reproduced: naive rebuild with foreign_keys ON cascade-deletes child rows', () => {
  const db = seeded();
  db.exec('BEGIN'); db.exec(REBUILD_ENTRIES); db.exec('COMMIT');
  assert.equal(db.get('SELECT COUNT(*) n FROM entries').n, 1);
  assert.equal(db.get('SELECT COUNT(*) n FROM entry_links').n, 0, 'links silently deleted by DROP TABLE cascade');
});

test('R-34 FK-safe rebuild (foreign_keys OFF outside txn + foreign_key_check) preserves child rows', () => {
  const db = seeded();
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  db.exec(REBUILD_ENTRIES);
  assert.equal(db.all('PRAGMA foreign_key_check').length, 0);
  db.exec('COMMIT');
  db.exec('PRAGMA foreign_keys = ON');
  assert.equal(db.get('PRAGMA foreign_keys').foreign_keys, 1);
  assert.equal(db.get('SELECT COUNT(*) n FROM entry_links').n, 2);
});

test('PRAGMA foreign_keys inside a transaction has no effect (documented SQLite behavior)', () => {
  const db = seeded();
  db.exec('BEGIN'); db.exec('PRAGMA foreign_keys = OFF');
  assert.equal(db.get('PRAGMA foreign_keys').foreign_keys, 1);
  db.exec('ROLLBACK');
});

test('O-020: built-in IDs live in a reserved namespace that random v4 UUIDs can never enter', () => {
  const RESERVED = /^4d454d30-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const db = seeded();
  for (const r of db.all('SELECT id FROM collection_types UNION ALL SELECT id FROM categories')) assert.match(r.id, RESERVED);
  for (let i = 0; i < 10000; i++) assert.doesNotMatch(randomUUID(), RESERVED); // v4 has version nibble 4, reserved has 8
});

test('O-026 evidence: SQLite lower()/LIKE do not fold Turkish letters; app-level folding does', () => {
  const db = openMemoryDb();
  assert.equal(db.get("SELECT lower('İSTANBUL') = 'istanbul' v").v, 0, 'built-in lower() is ASCII-only');
  assert.equal(db.get("SELECT 'ŞEKER' LIKE 'şeker' v").v, 0, 'LIKE is ASCII-case-insensitive only');
  const fold = (s) => s.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[İIı]/g, 'i').toLowerCase();
  assert.equal(fold('İSTANBUL'), 'istanbul');
  assert.equal(fold('Işık'), 'isik');
  assert.equal(fold('ŞEKER çiçek ÖĞÜ'), 'seker cicek ogu');
});
