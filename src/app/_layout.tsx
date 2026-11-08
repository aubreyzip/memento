import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';

import { AppearanceProvider, useAppearance } from '@/design-system/appearance-provider';
import { SettingController } from '@/features/settings/setting-controller';
import { createI18n } from '@/localization/i18n';
import { LocalizationProvider, useTranslation } from '@/localization/localization-provider';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings-repository';

function createAppServices() {
  // Interim: in-memory settings until the encrypted `app_settings` table exists (O-044).
  const settings = new InMemorySettingsRepository();
  return {
    appearance: new SettingController('appearance', settings),
    language: new SettingController('language', settings),
    i18n: createI18n(),
  };
}

export default function RootLayout() {
  const [services] = useState(createAppServices);

  useEffect(() => {
    void services.appearance.load();
    void services.language.load();
  }, [services]);

  return (
    <LocalizationProvider store={services.language} i18nInstance={services.i18n}>
      <AppearanceProvider controller={services.appearance}>
        <NavigationTheme>
          <RootStack />
        </NavigationTheme>
      </AppearanceProvider>
    </LocalizationProvider>
  );
}

/** Primary areas live in `(tabs)`; Quick Capture opens as a modal over any of them (SDD §7.1). */
function RootStack() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="capture" options={{ presentation: 'modal', title: t('capture.title') }} />
    </Stack>
  );
}

function NavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors: c } = useAppearance();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: c.primary,
          background: c.background,
          card: c.surface,
          text: c.textPrimary,
          border: c.border,
          // Badges indicate state, so they use `primary`, never the decorative accent (O-042).
          notification: c.primary,
        },
      }}>
      {children}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
