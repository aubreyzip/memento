import { File } from 'expo-file-system';
import { defaultDatabaseDirectory } from 'expo-sqlite';

import { DATABASE_NAME } from '@/database/connection/expo-sql-database';
import type { DatabaseFiles } from '@/database/bootstrap/ports';

const SIDECAR_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const;

/** expo-sqlite reports a plain path (verified in its Android/iOS sources); FileSystem needs a URI. */
export function databaseDirectoryUri(): string {
  const dir = String(defaultDatabaseDirectory);
  return dir.startsWith('file://') ? dir : `file://${dir}`;
}

/** A file in the database directory, by name. */
export const databaseDirectoryFile = (fileName: string) =>
  new File(databaseDirectoryUri(), fileName);

/**
 * Database file operations for the O-019 key-state flow. Verified on device by gate G3.
 * The name parameter exists for the on-device checks, which use their own file (O-017).
 */
export function createExpoDatabaseFiles(name: string): DatabaseFiles {
  return {
    async exists() {
      const file = databaseDirectoryFile(name);
      return file.exists && (file.size ?? 0) > 0;
    },

    async quarantine(stamp) {
      const moved: string[] = [];
      // Renames within the same directory: contents are not rewritten. Never delete.
      for (const suffix of SIDECAR_SUFFIXES) {
        const file = databaseDirectoryFile(`${name}${suffix}`);
        if (!file.exists) continue;
        const target = `${name}${suffix}.quarantine-${stamp}`;
        await file.move(databaseDirectoryFile(target));
        moved.push(target);
      }
      return moved;
    },
  };
}

export const expoDatabaseFiles = createExpoDatabaseFiles(DATABASE_NAME);
