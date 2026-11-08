import { getRandomBytes } from 'expo-crypto';

import { expoDatabaseFiles } from '@/services/files/expo-database-files';
import { secureStoreKeyStore } from '@/services/security/secure-store-key-store';

import { openExpoDatabase } from '../connection/expo-sql-database';

import { openEncryptedDatabase, type DatabaseStartResult } from './open-encrypted-database';

/** Production wiring of the encrypted startup (device modules). Tests use fakes instead. */
export function startDatabase(): Promise<DatabaseStartResult> {
  return openEncryptedDatabase({
    files: expoDatabaseFiles,
    keyStore: secureStoreKeyStore,
    connect: openExpoDatabase,
    randomBytes: getRandomBytes,
    now: () => new Date(),
  });
}
