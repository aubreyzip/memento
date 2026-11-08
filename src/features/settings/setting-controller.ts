import { SETTING_DEFAULTS, type SettingKey, type SettingValues } from '@/domain/settings';
import type { SettingsRepository } from '@/repositories/settings-repository';

type Listener = () => void;

/**
 * Holds the current value of one setting and keeps it in sync with the repository.
 * Changes apply immediately (optimistic update); if saving fails, the previous value is restored.
 * Until `load()` completes, and if loading fails, the default applies (System, O-044).
 * Designed for React's `useSyncExternalStore`.
 */
export class SettingController<K extends SettingKey> {
  private value: SettingValues[K];
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly key: K,
    private readonly repository: SettingsRepository,
  ) {
    this.value = SETTING_DEFAULTS[key];
  }

  getValue = (): SettingValues[K] => this.value;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async load(): Promise<void> {
    try {
      this.update(await this.repository.get(this.key));
    } catch {
      this.update(SETTING_DEFAULTS[this.key]);
    }
  }

  setValue = async (next: SettingValues[K]): Promise<void> => {
    const previous = this.value;
    this.update(next);
    try {
      await this.repository.set(this.key, next);
    } catch (error) {
      this.update(previous);
      throw error;
    }
  };

  private update(next: SettingValues[K]): void {
    if (next === this.value) return;
    this.value = next;
    this.listeners.forEach((listener) => listener());
  }
}
