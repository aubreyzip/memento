import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import type { AppearancePreference } from '@/domain/settings';

import { resolveColorScheme } from './resolve-color-scheme';
import { colors, type ColorSchemeName, type SemanticColors } from './tokens';

/** What the provider needs from the settings layer (implemented by `SettingController`). */
export type AppearanceStore = {
  subscribe: (listener: () => void) => () => void;
  getValue: () => AppearancePreference;
  setValue: (next: AppearancePreference) => Promise<void>;
};

type AppearanceContextValue = {
  preference: AppearancePreference;
  scheme: ColorSchemeName;
  colors: SemanticColors;
  setPreference: (next: AppearancePreference) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  controller,
  children,
}: {
  controller: AppearanceStore;
  children: ReactNode;
}) {
  const preference = useSyncExternalStore(controller.subscribe, controller.getValue);
  const scheme = resolveColorScheme(preference, useColorScheme());

  const value = useMemo<AppearanceContextValue>(
    () => ({
      preference,
      scheme,
      colors: colors[scheme],
      setPreference: controller.setValue,
    }),
    [controller, preference, scheme],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/** Current appearance. Outside a provider it follows the OS scheme (O-044 default). */
export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  const systemScheme = resolveColorScheme('system', useColorScheme());
  if (context) return context;
  return {
    preference: 'system',
    scheme: systemScheme,
    colors: colors[systemScheme],
    setPreference: async () => {
      throw new Error('AppearanceProvider is not mounted');
    },
  };
}
