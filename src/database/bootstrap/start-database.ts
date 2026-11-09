import { getRandomBytes } from 'expo-crypto';
import { defaultDatabaseDirectory } from 'expo-sqlite';

import { excludeFromBackup } from '@/services/files/backup-exclusion';
import { expoDatabaseFiles } from '@/services/files/expo-database-files';
import { secureStoreKeyStore } from '@/services/security/secure-store-key-store';

import { openExpoDatabase } from '../connection/expo-sql-database';

import { openEncryptedDatabase, type DatabaseStartResult } from './open-encrypted-database';

/** Production wiring of the encrypted startup (device modules). Tests use fakes instead. */
export async function startDatabase(): Promise<DatabaseStartResult> {
  const result = await openEncryptedDatabase({
    files: expoDatabaseFiles,
    keyStore: secureStoreKeyStore,
    connect: () => openExpoDatabase(),
    randomBytes: getRandomBytes,
    now: () => new Date(),
  });

  // O-018/O-039: after every startup outcome, so quarantined files (same directory) are covered
  // too, and re-applied each time because some file operations reset the flag. Non-blocking.
  await excludeFromBackup(String(defaultDatabaseDirectory));

  return result;
}
