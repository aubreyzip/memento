import { InMemorySettingsRepository } from '../in-memory-settings-repository';
import { describeSettingsRepositoryContract } from '../testing/settings-repository-contract';

describeSettingsRepositoryContract(
  'InMemorySettingsRepository',
  () => new InMemorySettingsRepository(),
);

describe('InMemorySettingsRepository', () => {
  it('does not persist across instances (interim behavior, O-044)', async () => {
    await new InMemorySettingsRepository().set('appearance', 'dark');
    await expect(new InMemorySettingsRepository().get('appearance')).resolves.toBe('system');
  });
});
