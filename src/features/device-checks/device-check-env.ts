import { getRandomBytes } from 'expo-crypto';
import { Directory, File } from 'expo-file-system';

import { openExpoDatabase } from '@/database/connection/expo-sql-database';
import {
  createExpoDatabaseFiles,
  databaseDirectoryFile,
  databaseDirectoryUri,
} from '@/services/files/expo-database-files';
import { createSecureStoreKeyStore } from '@/services/security/secure-store-key-store';

import type { DeviceCheckEnv } from './run-device-checks';

/** Check-only names. Never the app's `memento.db` or `memento.database-key.v1` (O-017). */
export const CHECK_DATABASE_NAME = 'memento-device-check.db';
export const CHECK_KEY_NAME = 'memento.device-check-key.v1';

/** Device wiring for the on-device checks: real expo-sqlite (SQLCipher), SecureStore, files. */
export function createDeviceCheckEnv(): DeviceCheckEnv {
  return {
    databaseName: CHECK_DATABASE_NAME,
    files: createExpoDatabaseFiles(CHECK_DATABASE_NAME),
    connect: (fileName) => openExpoDatabase(fileName),
    secureKeyStore: createSecureStoreKeyStore(CHECK_KEY_NAME),
    async readFile(fileName) {
      const file = databaseDirectoryFile(fileName);
      return file.exists ? file.bytes() : null;
    },
    async replaceFile(from, to) {
      await databaseDirectoryFile(from).copy(databaseDirectoryFile(to), { overwrite: true });
    },
    async removeCheckFiles() {
      const dir = new Directory(databaseDirectoryUri());
      if (!dir.exists) return;
      for (const item of dir.list()) {
        // Only files this suite created; the prefix cannot match `memento.db`.
        if (item instanceof File && item.name.startsWith(CHECK_DATABASE_NAME)) item.delete();
      }
    },
    randomBytes: getRandomBytes,
    now: () => new Date(),
  };
}
