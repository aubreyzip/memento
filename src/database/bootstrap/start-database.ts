import { getRandomBytes } from 'expo-crypto';

import { expoDatabaseFiles } from '@/services/files/expo-database-files';
import { secureStoreKeyStore } from '@/services/security/secure-store-key-store';

import { openExpoDatabase } from '../connection/expo-sql-database';

import { openEncryptedDatabase, type DatabaseStartResult } from './open-encrypted-database';

/**
 * Production wiring of the encrypted startup (device modules). Tests use fakes instead.
 * OS backup exclusion (O-018) needs no runtime step on Android: it comes from the manifest
 * backup rules (plugins/with-no-os-backup, SDD §12.4).
 */
export function startDatabase(): Promise<DatabaseStartResult> {
  return openEncryptedDatabase({
    files: expoDatabaseFiles,
    keyStore: secureStoreKeyStore,
    connect: () => openExpoDatabase(),
    randomBytes: getRandomBytes,
    now: () => new Date(),
  });
}
