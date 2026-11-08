import type { SQLiteDatabase } from 'expo-sqlite';

import { wrapExpoDatabase } from '../expo-sql-database';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

function fakeExpoDb() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 3, lastInsertRowId: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([{ a: 1 }]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    withExclusiveTransactionAsync: jest.fn(),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('wrapExpoDatabase', () => {
  it('maps calls and parameters onto expo-sqlite', async () => {
    const native = fakeExpoDb();
    const db = wrapExpoDatabase(native as unknown as SQLiteDatabase);

    await db.exec('PRAGMA foreign_keys = ON');
    await expect(db.run('UPDATE t SET a = ?', [1])).resolves.toEqual({ changes: 3 });
    await expect(db.all('SELECT a FROM t WHERE b = ?', ['x'])).resolves.toEqual([{ a: 1 }]);
    await db.close();

    expect(native.execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    expect(native.runAsync).toHaveBeenCalledWith('UPDATE t SET a = ?', [1]);
    expect(native.getAllAsync).toHaveBeenCalledWith('SELECT a FROM t WHERE b = ?', ['x']);
    expect(native.closeAsync).toHaveBeenCalled();
  });

  it('returns undefined, not null, when no row matches', async () => {
    const db = wrapExpoDatabase(fakeExpoDb() as unknown as SQLiteDatabase);
    await expect(db.get('SELECT 1 WHERE 0')).resolves.toBeUndefined();
  });

  it('runs transactions on the same keyed connection and returns the task result', async () => {
    const native = fakeExpoDb();
    const db = wrapExpoDatabase(native as unknown as SQLiteDatabase);

    await expect(db.transaction(async () => 42)).resolves.toBe(42);

    expect(native.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(native.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  });

  it('propagates a failing transaction', async () => {
    const native = fakeExpoDb();
    native.withTransactionAsync.mockImplementation(async (task) => task());
    const db = wrapExpoDatabase(native as unknown as SQLiteDatabase);

    await expect(
      db.transaction(async () => {
        throw new Error('constraint');
      }),
    ).rejects.toThrow('constraint');
  });
});
