import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppearanceProvider, useAppearance } from '@/design-system/appearance-provider';
import { createI18n } from '@/localization/i18n';
import { LocalizationProvider, useTranslation } from '@/localization/localization-provider';
import type { SettingsRepository } from '@/repositories/settings-repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings-repository';

import { AppearancePicker } from '../appearance-picker';
import { LanguagePicker } from '../language-picker';
import { SettingController } from '../setting-controller';

// Device primary language: Turkish. React Native's test environment reports a light OS scheme.
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'tr' }] }));

function Probe() {
  const { scheme } = useAppearance();
  const { language, t } = useTranslation();
  return <Text testID="probe">{`${scheme}|${language}|${t('settings.appearance.label')}`}</Text>;
}

async function renderSettings(repository: SettingsRepository = new InMemorySettingsRepository()) {
  const appearance = new SettingController('appearance', repository);
  const language = new SettingController('language', repository);
  await render(
    <LocalizationProvider store={language} i18nInstance={createI18n()}>
      <AppearanceProvider controller={appearance}>
        <Probe />
        <AppearancePicker />
        <LanguagePicker />
      </AppearanceProvider>
    </LocalizationProvider>,
  );
  return { appearance, language };
}

const probe = () => screen.getByTestId('probe');

describe('settings pickers', () => {
  it('starts on System for both settings, following the device (O-034, O-044)', async () => {
    await renderSettings();

    expect(probe()).toHaveTextContent('light|tr|Görünüm');
    for (const group of ['Görünüm', 'Dil']) {
      const radios = within(screen.getByLabelText(group));
      expect(radios.getAllByRole('radio', { selected: true })).toHaveLength(1);
      expect(radios.getByRole('radio', { name: 'Sistem' })).toBeSelected();
    }
  });

  it('switching to Dark applies immediately', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByRole('radio', { name: 'Koyu' }));

    expect(probe()).toHaveTextContent('dark|tr|Görünüm');
    expect(screen.getByRole('radio', { name: 'Koyu' })).toBeSelected();
  });

  it('switching to English re-renders every label immediately, without a restart', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(probe()).toHaveTextContent('light|en|Appearance');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'English' })).toBeSelected();
    // Language names stay in their own language.
    expect(screen.getByRole('radio', { name: 'Türkçe' })).toBeOnTheScreen();
  });

  it('restores the previous selection when saving fails', async () => {
    const failing: SettingsRepository = {
      get: (key) => new InMemorySettingsRepository().get(key),
      set: () => Promise.reject(new Error('disk full')),
    };
    await renderSettings(failing);

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(probe()).toHaveTextContent('light|tr|Görünüm');
  });
});

describe('outside the providers (screens before the database opens, O-044)', () => {
  it('uses the System appearance and the device language', async () => {
    await render(<Probe />);

    expect(probe()).toHaveTextContent('light|tr|Görünüm');
  });
});
