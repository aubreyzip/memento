import { FakeEncryptedStorage } from '../../testing/fake-encrypted-storage';
import { isValidDatabaseKey } from '../database-key';
import { openEncryptedDatabase } from '../open-encrypted-database';

const WRONG_KEY = 'f'.repeat(64);

async function userTables(storage: FakeEncryptedStorage) {
  return (
    await storage.file!.db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
  ).map((row) => row.name);
}

/** Opens once (first run), writes a marker row, closes: simulates an installed app with data. */
async function installWithData(storage: FakeEncryptedStorage) {
  const first = await openEncryptedDatabase(storage.dependencies());
  if (first.status !== 'ready') throw new Error('setup failed');
  await first.db.run(
    "INSERT INTO app_settings (key, value, updated_at) VALUES ('language', 'tr', 'x')",
  );
  await first.db.close();
}

describe('openEncryptedDatabase (O-019, SDD §8.1.1)', () => {
  let storage: FakeEncryptedStorage;
  beforeEach(() => {
    storage = new FakeEncryptedStorage();
  });

  it('state A: first run creates a key, stores it, and creates the schema', async () => {
    const result = await openEncryptedDatabase(storage.dependencies());

    expect(result).toMatchObject({ status: 'ready', firstRun: true });
    expect(isValidDatabaseKey(storage.storedKey)).toBe(true);
    expect(storage.file!.boundKey).toBe(storage.storedKey);
    expect(await userTables(storage)).toContain('app_settings');
  });

  it('applies the key with the raw-key form and enables foreign keys and WAL', async () => {
    await openEncryptedDatabase(storage.dependencies());
    // Key first, before any other statement; then connection setup; then migrations.
    expect(storage.pragmas.slice(0, 3)).toEqual([
      `PRAGMA key = "x'${storage.storedKey}'"`,
      'PRAGMA foreign_keys = ON',
      'PRAGMA journal_mode = WAL',
    ]);
  });

  it('state B: reopens existing data with the stored key, without re-creating anything', async () => {
    await installWithData(storage);
    const keyBefore = storage.storedKey;

    const result = await openEncryptedDatabase(storage.dependencies());

    expect(result).toMatchObject({ status: 'ready', firstRun: false });
    expect(storage.storedKey).toBe(keyBefore);
    if (result.status !== 'ready') throw new Error();
    await expect(
      result.db.get<{ value: string }>("SELECT value FROM app_settings WHERE key = 'language'"),
    ).resolves.toEqual({ value: 'tr' });
    expect(storage.quarantined).toHaveLength(0);
  });

  it('state C: data without a key is quarantined, never deleted or opened', async () => {
    await installWithData(storage);
    const originalFile = storage.file;
    storage.storedKey = null; // e.g. restored to a new phone by an OS backup

    const result = await openEncryptedDatabase(storage.dependencies());

    expect(result).toEqual({
      status: 'recovery',
      reason: 'key-missing',
      quarantined: ['memento.db.quarantine-2026-11-08T12-00-00-000Z'],
    });
    expect(storage.quarantined[0].file).toBe(originalFile);
    expect(storage.quarantined[0].file.hasData).toBe(true);
    expect(storage.openConnections.size).toBe(0);
  });

  it('state D: data with a wrong key is quarantined after the failed probe', async () => {
    await installWithData(storage);
    storage.storedKey = WRONG_KEY;

    const result = await openEncryptedDatabase(storage.dependencies());

    expect(result).toMatchObject({ status: 'recovery', reason: 'key-mismatch' });
    expect(storage.quarantined).toHaveLength(1);
    expect(storage.openConnections.size).toBe(0);
  });

  it('a corrupt stored key with existing data is treated as a mismatch', async () => {
    await installWithData(storage);
    storage.storedKey = 'not-a-key';

    const result = await openEncryptedDatabase(storage.dependencies());

    expect(result).toMatchObject({ status: 'recovery', reason: 'key-mismatch' });
  });

  it('state E: an existing key with no database creates a new database with that key', async () => {
    storage.storedKey = 'a'.repeat(64);

    const result = await openEncryptedDatabase(storage.dependencies());

    expect(result).toMatchObject({ status: 'ready', firstRun: true });
    expect(storage.storedKey).toBe('a'.repeat(64));
    expect(storage.file!.boundKey).toBe('a'.repeat(64));
  });

  it('a corrupt stored key with no database is replaced (no data to protect)', async () => {
    storage.storedKey = 'garbage';
    const result = await openEncryptedDatabase(storage.dependencies());
    expect(result.status).toBe('ready');
    expect(isValidDatabaseKey(storage.storedKey)).toBe(true);
  });

  it('an empty file left by an earlier open is not treated as data', async () => {
    storage.createEmptyFile();
    const result = await openEncryptedDatabase(storage.dependencies());
    expect(result).toMatchObject({ status: 'ready', firstRun: true });
    expect(storage.quarantined).toHaveLength(0);
  });

  it('"Start fresh" after a quarantine creates a new empty database and keeps the old file', async () => {
    await installWithData(storage);
    storage.storedKey = null;
    await openEncryptedDatabase(storage.dependencies()); // quarantines

    const fresh = await openEncryptedDatabase(storage.dependencies());

    expect(fresh).toMatchObject({ status: 'ready', firstRun: true });
    if (fresh.status !== 'ready') throw new Error();
    await expect(fresh.db.get('SELECT * FROM app_settings')).resolves.toBeUndefined();
    expect(storage.quarantined).toHaveLength(1);
    expect(storage.quarantined[0].file.hasData).toBe(true);
  });

  describe('fails closed and changes nothing', () => {
    it('when SQLCipher is unavailable: no key generated, nothing written', async () => {
      storage.cipherAvailable = false;

      const result = await openEncryptedDatabase(storage.dependencies());

      expect(result).toEqual({ status: 'error', reason: 'cipher-unavailable' });
      expect(storage.storedKey).toBeNull();
      expect(storage.file!.hasData).toBe(false);
      expect(storage.pragmas).toEqual([]);
      expect(storage.openConnections.size).toBe(0);
    });

    it('when SQLCipher is unavailable and data exists: data is not quarantined or modified', async () => {
      await installWithData(storage);
      storage.cipherAvailable = false;

      const result = await openEncryptedDatabase(storage.dependencies());

      expect(result).toEqual({ status: 'error', reason: 'cipher-unavailable' });
      expect(storage.quarantined).toHaveLength(0);
      expect(storage.file!.hasData).toBe(true);
    });

    it('when the key store cannot be read: not treated as a missing key (no quarantine)', async () => {
      await installWithData(storage);
      storage.keyStoreReadError = new Error('device locked');

      const result = await openEncryptedDatabase(storage.dependencies());

      expect(result).toEqual({ status: 'error', reason: 'key-store-unavailable' });
      expect(storage.quarantined).toHaveLength(0);
    });

    it('when the new key cannot be stored: no database is created', async () => {
      storage.keyStoreWriteError = new Error('keystore full');

      const result = await openEncryptedDatabase(storage.dependencies());

      expect(result).toEqual({ status: 'error', reason: 'key-store-failed' });
      expect(storage.file!.hasData).toBe(false);
      expect(storage.openConnections.size).toBe(0);
    });

    it('when the database was written by a newer app: it is left untouched', async () => {
      await installWithData(storage);
      await storage.file!.db.exec('PRAGMA user_version = 99');

      const result = await openEncryptedDatabase(storage.dependencies());

      expect(result).toEqual({ status: 'error', reason: 'newer-than-app' });
      expect(storage.quarantined).toHaveLength(0);
      expect(
        (await storage.file!.db.get<{ user_version: number }>('PRAGMA user_version'))!.user_version,
      ).toBe(99);
      expect(storage.openConnections.size).toBe(0);
    });

    it('when the database cannot be opened at all', async () => {
      const deps = storage.dependencies();
      const result = await openEncryptedDatabase({
        ...deps,
        connect: () => Promise.reject(new Error('disk I/O error')),
      });
      expect(result).toEqual({ status: 'error', reason: 'open-failed' });
    });
  });

  it('refuses a broken random source instead of creating a predictable key', async () => {
    const result = await openEncryptedDatabase(storage.dependencies((n) => new Uint8Array(n)));
    expect(result).toEqual({ status: 'error', reason: 'open-failed' });
    expect(storage.storedKey).toBeNull();
    expect(storage.file!.hasData).toBe(false);
  });
});
