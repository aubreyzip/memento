import type { SettingsRepository } from '../settings-repository';

/**
 * Behavior every SettingsRepository implementation must satisfy. Reused by the SQLite
 * implementation in Phase 1 slice 5, which adds its own persistence-across-restart test.
 */
export function describeSettingsRepositoryContract(
  name: string,
  createRepository: () => SettingsRepository | Promise<SettingsRepository>,
): void {
  describe(`${name} (SettingsRepository contract)`, () => {
    let repository: SettingsRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it.each(['appearance', 'language'] as const)(
      'returns System for "%s" when nothing is stored',
      async (key) => {
        await expect(repository.get(key)).resolves.toBe('system');
      },
    );

    it.each(['system', 'light', 'dark'] as const)(
      'stores and returns appearance "%s"',
      async (value) => {
        await repository.set('appearance', value);
        await expect(repository.get('appearance')).resolves.toBe(value);
      },
    );

    it.each(['system', 'en', 'tr'] as const)('stores and returns language "%s"', async (value) => {
      await repository.set('language', value);
      await expect(repository.get('language')).resolves.toBe(value);
    });

    it.each([
      ['appearance', 'dark', 'sepia'],
      ['language', 'tr', 'de'],
    ] as const)(
      'rejects an invalid %s value and keeps the previous one',
      async (key, valid, invalid) => {
        await repository.set(key, valid);
        // Simulates corrupt input reaching the boundary at runtime.
        await expect(repository.set(key, invalid as never)).rejects.toThrow(RangeError);
        await expect(repository.get(key)).resolves.toBe(valid);
      },
    );

    it('stores settings independently', async () => {
      await repository.set('appearance', 'dark');
      await repository.set('language', 'tr');
      await expect(repository.get('appearance')).resolves.toBe('dark');
      await expect(repository.get('language')).resolves.toBe('tr');
    });
  });
}
