import { File } from 'expo-file-system';
import { defaultDatabaseDirectory } from 'expo-sqlite';

import { DATABASE_NAME } from '@/database/connection/expo-sql-database';
import type { DatabaseFiles } from '@/database/bootstrap/ports';

const SIDECAR_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const;

/** expo-sqlite reports a plain path (verified in its Android/iOS sources); FileSystem needs a URI. */
function directoryUri(): string {
  const dir = String(defaultDatabaseDirectory);
  return dir.startsWith('file://') ? dir : `file://${dir}`;
}

const databaseFile = (suffix = '') => new File(directoryUri(), `${DATABASE_NAME}${suffix}`);

/** Database file operations for the O-019 key-state flow. Verified on device by gate G3. */
export const expoDatabaseFiles: DatabaseFiles = {
  async exists() {
    const file = databaseFile();
    return file.exists && (file.size ?? 0) > 0;
  },

  async quarantine(stamp) {
    const moved: string[] = [];
    for (const suffix of SIDECAR_SUFFIXES) {
      const file = databaseFile(suffix);
      if (!file.exists) continue;
      const target = `${DATABASE_NAME}${suffix}.quarantine-${stamp}`;
      // A rename within the same directory: contents are not rewritten. Never delete.
      await file.move(new File(directoryUri(), target));
      moved.push(target);
    }
    return moved;
  },
};
