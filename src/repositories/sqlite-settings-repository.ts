import type { SqlDatabase } from '@/database/connection/sql-database';
import {
  SETTING_DEFAULTS,
  SETTING_VALIDATORS,
  type SettingKey,
  type SettingValues,
} from '@/domain/settings';

import type { SettingsRepository } from './settings-repository';

/**
 * SettingsRepository on the `app_settings` table (DATABASE_DESIGN §3.1). Values are stored as
 * plain strings; a missing or unrecognized stored value reads as the default. Never stores
 * key material (O-019).
 */
export class SqliteSettingsRepository implements SettingsRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async get<K extends SettingKey>(key: K): Promise<SettingValues[K]> {
    const row = await this.db.get<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    const value = row?.value;
    return SETTING_VALIDATORS[key](value) ? value : SETTING_DEFAULTS[key];
  }

  async set<K extends SettingKey>(key: K, value: SettingValues[K]): Promise<void> {
    if (!SETTING_VALIDATORS[key](value)) {
      throw new RangeError(`Invalid value for setting "${key}"`);
    }
    await this.db.run(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, this.now()],
    );
  }
}
