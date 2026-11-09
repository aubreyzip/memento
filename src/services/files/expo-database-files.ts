import { File } from 'expo-file-system';
import { defaultDatabaseDirectory } from 'expo-sqlite';

import { DATABASE_NAME } from '@/database/connection/expo-sql-database';
import type { DatabaseFiles } from '@/database/bootstrap/ports';

const SIDECAR_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const;

/** Name suffix of the pre-open copies taken before the key check (O-051). */
const snapshotSuffix = (stamp: string) => `.pre-open-${stamp}`;

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

    async snapshot(stamp) {
      const wal = databaseDirectoryFile(`${name}-wal`);
      if (!wal.exists || (wal.size ?? 0) === 0) return [];
      const copied: string[] = [];
      for (const suffix of SIDECAR_SUFFIXES) {
        const file = databaseDirectoryFile(`${name}${suffix}`);
        if (!file.exists) continue;
        const target = `${name}${suffix}${snapshotSuffix(stamp)}`;
        await file.copy(databaseDirectoryFile(target));
        copied.push(target);
      }
      return copied;
    },

    async discardSnapshot(stamp) {
      for (const suffix of SIDECAR_SUFFIXES) {
        const copy = databaseDirectoryFile(`${name}${suffix}${snapshotSuffix(stamp)}`);
        if (copy.exists) copy.delete();
      }
    },

    async quarantine(stamp) {
      const snapshots = SIDECAR_SUFFIXES.map((suffix) =>
        databaseDirectoryFile(`${name}${suffix}${snapshotSuffix(stamp)}`),
      );
      const hasSnapshot = snapshots.some((f) => f.exists);
      const moved: string[] = [];
      // Renames within the same directory: contents are not rewritten. Never delete.
      for (const suffix of SIDECAR_SUFFIXES) {
        const file = databaseDirectoryFile(`${name}${suffix}`);
        if (!file.exists) continue;
        // With a snapshot, the live files were opened by the key check and may have changed.
        const target = `${name}${suffix}.quarantine-${stamp}${hasSnapshot ? '.after-key-check' : ''}`;
        await file.move(databaseDirectoryFile(target));
        moved.push(target);
      }
      for (const [i, suffix] of SIDECAR_SUFFIXES.entries()) {
        if (!snapshots[i].exists) continue;
        const target = `${name}${suffix}.quarantine-${stamp}`;
        await snapshots[i].move(databaseDirectoryFile(target));
        moved.push(target);
      }
      return moved;
    },
  };
}

export const expoDatabaseFiles = createExpoDatabaseFiles(DATABASE_NAME);
