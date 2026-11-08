import {
  SETTING_DEFAULTS,
  SETTING_VALIDATORS,
  type SettingKey,
  type SettingValues,
} from '@/domain/settings';

import type { SettingsRepository } from './settings-repository';

/** Interim implementation: values live only for the current app session (O-044). */
export class InMemorySettingsRepository implements SettingsRepository {
  private readonly values = new Map<SettingKey, unknown>();

  async get<K extends SettingKey>(key: K): Promise<SettingValues[K]> {
    const stored = this.values.get(key);
    return SETTING_VALIDATORS[key](stored) ? (stored as SettingValues[K]) : SETTING_DEFAULTS[key];
  }

  async set<K extends SettingKey>(key: K, value: SettingValues[K]): Promise<void> {
    if (!SETTING_VALIDATORS[key](value)) {
      throw new RangeError(`Invalid value for setting "${key}"`);
    }
    this.values.set(key, value);
  }
}
