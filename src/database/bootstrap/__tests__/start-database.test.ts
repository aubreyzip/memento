import type { DatabaseStartResult } from '../open-encrypted-database';

jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '/data/user/0/com.aubreyzip.memento/files/SQLite',
  openDatabaseAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({ getRandomBytes: jest.fn() }));
jest.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1 }));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('../../../services/files/backup-exclusion', () => ({
  excludeFromBackup: jest.fn().mockResolvedValue('excluded'),
}));
jest.mock('../open-encrypted-database', () => ({ openEncryptedDatabase: jest.fn() }));

const { excludeFromBackup } = jest.requireMock('../../../services/files/backup-exclusion');
const { openEncryptedDatabase } = jest.requireMock('../open-encrypted-database');
const { startDatabase } = jest.requireActual('../start-database');

describe('startDatabase backup exclusion (O-018, O-039)', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each<DatabaseStartResult>([
    { status: 'ready', db: {} as never, firstRun: true },
    // Quarantined files stay in the same directory and must not reach a backup either.
    { status: 'recovery', reason: 'key-missing', quarantined: ['memento.db.quarantine-x'] },
    { status: 'error', reason: 'cipher-unavailable' },
  ])(
    'applies the exclusion after a "$status" startup and returns the result unchanged',
    async (result) => {
      openEncryptedDatabase.mockResolvedValue(result);

      await expect(startDatabase()).resolves.toBe(result);

      expect(excludeFromBackup).toHaveBeenCalledWith(
        '/data/user/0/com.aubreyzip.memento/files/SQLite',
      );
    },
  );

  it('does not let an exclusion failure change the startup result', async () => {
    const result: DatabaseStartResult = { status: 'ready', db: {} as never, firstRun: false };
    openEncryptedDatabase.mockResolvedValue(result);
    excludeFromBackup.mockResolvedValue('failed');

    await expect(startDatabase()).resolves.toBe(result);
  });
});
