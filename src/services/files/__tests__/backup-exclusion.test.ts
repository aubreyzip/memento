import { excludeFromBackup } from '../backup-exclusion';

const DIR = '/var/mobile/Containers/Data/Application/X/Documents/SQLite';

describe('excludeFromBackup (O-018, O-039)', () => {
  it('does nothing on Android, where manifest rules apply', async () => {
    const native = { excludeFromBackupAsync: jest.fn() };
    await expect(excludeFromBackup(DIR, 'android', native)).resolves.toBe('not-applicable');
    expect(native.excludeFromBackupAsync).not.toHaveBeenCalled();
  });

  it('reports unavailable on iOS without the native module (e.g. Expo Go)', async () => {
    await expect(excludeFromBackup(DIR, 'ios', null)).resolves.toBe('unavailable');
  });

  it('sets the flag on iOS and confirms the read-back value', async () => {
    const native = { excludeFromBackupAsync: jest.fn().mockResolvedValue(true) };
    await expect(excludeFromBackup(DIR, 'ios', native)).resolves.toBe('excluded');
    expect(native.excludeFromBackupAsync).toHaveBeenCalledWith(DIR);
  });

  it('reports failure when the flag does not read back as set', async () => {
    const native = { excludeFromBackupAsync: jest.fn().mockResolvedValue(false) };
    await expect(excludeFromBackup(DIR, 'ios', native)).resolves.toBe('failed');
  });

  it('never throws, so startup is not blocked', async () => {
    const native = { excludeFromBackupAsync: jest.fn().mockRejectedValue(new Error('EPERM')) };
    await expect(excludeFromBackup(DIR, 'ios', native)).resolves.toBe('failed');
  });
});
