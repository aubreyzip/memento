import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initializeSchema } from '@/database/initialize-schema';
import { openNodeSqlDatabase, type NodeSqlDatabase } from '@/database/testing/node-sql-database';

import { SqliteSettingsRepository } from '../sqlite-settings-repository';
import { describeSettingsRepositoryContract } from '../testing/settings-repository-contract';

const open: NodeSqlDatabase[] = [];
afterEach(() => open.splice(0).forEach((db) => db.close()));

async function freshDatabase(filename?: string) {
  const db = openNodeSqlDatabase(filename);
  open.push(db);
  await initializeSchema(db);
  return db;
}

describeSettingsRepositoryContract(
  'SqliteSettingsRepository',
  async () => new SqliteSettingsRepository(await freshDatabase()),
);

describe('SqliteSettingsRepository', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'memento-settings-test-'));
  });
  afterEach(() => {
    // Close databases before removing this test's own temp folder (Windows locks open files).
    open.splice(0).forEach((db) => db.close());
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists across a restart (FR-005, T-004, T-030)', async () => {
    const file = join(dir, 'test.db');
    const first = await freshDatabase(file);
    await new SqliteSettingsRepository(first).set('appearance', 'dark');
    await new SqliteSettingsRepository(first).set('language', 'tr');
    first.close();
    open.splice(open.indexOf(first), 1);

    const reopened = new SqliteSettingsRepository(await freshDatabase(file));

    await expect(reopened.get('appearance')).resolves.toBe('dark');
    await expect(reopened.get('language')).resolves.toBe('tr');
  });

  it('reads a corrupt stored value as the default', async () => {
    const db = await freshDatabase();
    await db.run("INSERT INTO app_settings (key, value, updated_at) VALUES ('language', 'xx', '')");
    await expect(new SqliteSettingsRepository(db).get('language')).resolves.toBe('system');
  });

  it('records when a value was updated', async () => {
    const db = await freshDatabase();
    const repository = new SqliteSettingsRepository(db, () => '2026-11-08T10:00:00.000Z');
    await repository.set('appearance', 'light');
    await new SqliteSettingsRepository(db, () => '2026-11-08T11:00:00.000Z').set(
      'appearance',
      'dark',
    );

    const rows = await db.all<{ value: string; updated_at: string }>(
      "SELECT value, updated_at FROM app_settings WHERE key = 'appearance'",
    );
    expect(rows).toEqual([{ value: 'dark', updated_at: '2026-11-08T11:00:00.000Z' }]);
  });
});
