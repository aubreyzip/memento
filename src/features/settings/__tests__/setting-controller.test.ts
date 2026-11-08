import type { SettingsRepository } from '@/repositories/settings-repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings-repository';

import { SettingController } from '../setting-controller';

function repositoryWith(overrides: Partial<SettingsRepository>): SettingsRepository {
  const base = new InMemorySettingsRepository();
  return {
    get: overrides.get ?? ((key) => base.get(key)),
    set: overrides.set ?? ((key, value) => base.set(key, value)),
  };
}

describe.each([
  ['appearance', 'dark', 'light'],
  ['language', 'tr', 'en'],
] as const)('SettingController(%s)', (key, first, second) => {
  it('starts at System before loading (O-044)', () => {
    expect(new SettingController(key, new InMemorySettingsRepository()).getValue()).toBe('system');
  });

  it('loads the stored value and notifies subscribers', async () => {
    const repository = new InMemorySettingsRepository();
    await repository.set(key, first);
    const controller = new SettingController(key, repository);
    const listener = jest.fn();
    controller.subscribe(listener);

    await controller.load();

    expect(controller.getValue()).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies a change immediately, before the save completes, and saves it', async () => {
    const repository = new InMemorySettingsRepository();
    const controller = new SettingController(key, repository);

    const pending = controller.setValue(second);
    expect(controller.getValue()).toBe(second);
    await pending;

    await expect(repository.get(key)).resolves.toBe(second);
  });

  it('restores the previous value when saving fails', async () => {
    const controller = new SettingController(
      key,
      repositoryWith({ set: () => Promise.reject(new Error('disk full')) }),
    );

    await expect(controller.setValue(first)).rejects.toThrow('disk full');
    expect(controller.getValue()).toBe('system');
  });

  it('keeps System when loading fails', async () => {
    const controller = new SettingController(
      key,
      repositoryWith({ get: () => Promise.reject(new Error('unavailable')) }),
    );

    await controller.load();
    expect(controller.getValue()).toBe('system');
  });

  it('does not notify for an unchanged value, nor after unsubscribe', async () => {
    const controller = new SettingController(key, new InMemorySettingsRepository());
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    await controller.setValue('system');
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
    await controller.setValue(first);
    expect(listener).not.toHaveBeenCalled();
  });
});

it('keeps settings independent of each other', async () => {
  const repository = new InMemorySettingsRepository();
  const appearance = new SettingController('appearance', repository);
  const language = new SettingController('language', repository);

  await appearance.setValue('dark');

  expect(language.getValue()).toBe('system');
  await expect(repository.get('language')).resolves.toBe('system');
});
