import type { SettingKey, SettingValues } from '@/domain/settings';

/**
 * Persistence boundary for user preferences (SDD §8.2).
 * Phase 1 slice 5 adds the SQLite implementation on `app_settings`; until then the app uses
 * `InMemorySettingsRepository`, so preferences reset on restart (O-044).
 */
export interface SettingsRepository {
  /** Returns the stored value, or the default when nothing valid is stored. */
  get<K extends SettingKey>(key: K): Promise<SettingValues[K]>;
  /** Stores a validated value. Rejects values that are not valid for the key. */
  set<K extends SettingKey>(key: K, value: SettingValues[K]): Promise<void>;
}
