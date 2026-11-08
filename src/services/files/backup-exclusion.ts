import { Platform } from 'react-native';

import BackupExclusion from '../../../modules/backup-exclusion';

export type BackupExclusionOutcome =
  /** iOS: the flag is set and read back as true. */
  | 'excluded'
  /** Android: exclusion comes from manifest backup rules, not at runtime (SDD §12.4). */
  | 'not-applicable'
  /** iOS without the native module (Expo Go, misconfigured build). */
  | 'unavailable'
  /** The native call failed or did not confirm the flag. */
  | 'failed';

type NativeModule = { excludeFromBackupAsync(path: string): Promise<boolean> } | null;

/**
 * Marks a directory as excluded from iOS backups (O-018, O-039). Best effort by design: Apple
 * does not guarantee exclusion, and keys are this-device-only, so a database that still reaches
 * a backup cannot be opened elsewhere and ends in O-019 recovery. Never throws; never logs paths.
 */
export async function excludeFromBackup(
  path: string,
  platform: string = Platform.OS,
  native: NativeModule = BackupExclusion,
): Promise<BackupExclusionOutcome> {
  if (platform !== 'ios') return 'not-applicable';
  if (!native) return 'unavailable';
  try {
    return (await native.excludeFromBackupAsync(path)) ? 'excluded' : 'failed';
  } catch {
    return 'failed';
  }
}
