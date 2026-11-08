import { requireOptionalNativeModule } from 'expo';

/** Native side of O-039. iOS only: Android uses manifest backup rules (plugins/with-no-os-backup). */
type BackupExclusionNativeModule = {
  excludeFromBackupAsync(path: string): Promise<boolean>;
};

/** Null on Android, in Expo Go, and in tests, where the native module is not linked. */
export default requireOptionalNativeModule<BackupExclusionNativeModule>('BackupExclusion');
