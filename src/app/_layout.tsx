import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';

import { startDatabase } from '@/database/bootstrap/start-database';
import type { ClosableSqlDatabase } from '@/database/connection/sql-database';
import { AppearanceProvider, useAppearance } from '@/design-system/appearance-provider';
import { createDeviceCheckEnv } from '@/features/device-checks/device-check-env';
import { DeviceChecksScreen } from '@/features/device-checks/device-checks-screen';
import { SettingController } from '@/features/settings/setting-controller';
import { DatabaseGate } from '@/features/startup/database-gate';
import { StartupLoadingScreen } from '@/features/startup/startup-screens';
import { createI18n } from '@/localization/i18n';
import { LocalizationProvider, useTranslation } from '@/localization/localization-provider';
import { SqliteSettingsRepository } from '@/repositories/sqlite-settings-repository';

/**
 * Developer-only on-device checks (O-017): a development build started with
 * EXPO_PUBLIC_DEVICE_CHECKS=1 runs them instead of the app and never opens the app database.
 * `__DEV__` is false in release builds, so this branch can never run there.
 */
const RUN_DEVICE_CHECKS = __DEV__ && process.env.EXPO_PUBLIC_DEVICE_CHECKS === '1';

export default function RootLayout() {
  if (RUN_DEVICE_CHECKS) return <DeviceChecksScreen createEnv={createDeviceCheckEnv} />;
  // Startup and recovery screens render outside the settings providers (O-044).
  return <DatabaseGate start={startDatabase}>{(db) => <App db={db} />}</DatabaseGate>;
}

function createAppServices(db: ClosableSqlDatabase) {
  const settings = new SqliteSettingsRepository(db);
  return {
    appearance: new SettingController('appearance', settings),
    language: new SettingController('language', settings),
    i18n: createI18n(),
  };
}

function App({ db }: { db: ClosableSqlDatabase }) {
  const [services] = useState(() => createAppServices(db));
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let current = true;
    // Load saved preferences before the first app frame, so the theme does not flash.
    Promise.all([services.appearance.load(), services.language.load()]).finally(
      () => current && setSettingsLoaded(true),
    );
    return () => {
      current = false;
    };
  }, [services]);

  if (!settingsLoaded) return <StartupLoadingScreen />;

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
