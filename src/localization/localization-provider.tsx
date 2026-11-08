import { getLocales } from 'expo-localization';
import type { i18n } from 'i18next';
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { LanguagePreference, SupportedLanguage } from '@/domain/settings';

import { createDeviceLanguageStore } from './device-language-store';
import { createI18n, translatorFor, type Translate } from './i18n';
import { resolveLanguage } from './resolve-language';

/** What the provider needs from the settings layer (implemented by `SettingController`). */
export type LanguageStore = {
  subscribe: (listener: () => void) => () => void;
  getValue: () => LanguagePreference;
  setValue: (next: LanguagePreference) => Promise<void>;
};

type LocalizationContextValue = {
  preference: LanguagePreference;
  language: SupportedLanguage;
  t: Translate;
  setPreference: (next: LanguagePreference) => Promise<void>;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

function readDeviceLanguageCode(): string | null {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

const deviceLanguage = createDeviceLanguageStore(readDeviceLanguageCode, AppState);

export function LocalizationProvider({
  store,
  i18nInstance,
  children,
}: {
  store: LanguageStore;
  i18nInstance: i18n;
  children: ReactNode;
}) {
  const preference = useSyncExternalStore(store.subscribe, store.getValue);
  const deviceLanguageCode = useSyncExternalStore(
    deviceLanguage.subscribe,
    deviceLanguage.getSnapshot,
  );

  const language = resolveLanguage(preference, deviceLanguageCode);
  const value = useMemo<LocalizationContextValue>(
    () => ({
      preference,
      language,
      t: translatorFor(i18nInstance, language),
      setPreference: store.setValue,
    }),
    [i18nInstance, language, preference, store],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

let fallbackI18n: i18n | undefined;

/**
 * Current language and translate function. Outside a provider (screens shown before settings
 * are available) it uses the System language with English fallback (O-044).
 */
export function useTranslation(): LocalizationContextValue {
  const context = useContext(LocalizationContext);
  if (context) return context;
  fallbackI18n ??= createI18n();
  const language = resolveLanguage('system', deviceLanguage.getSnapshot());
  return {
    preference: 'system',
    language,
    t: translatorFor(fallbackI18n, language),
    setPreference: async () => {
      throw new Error('LocalizationProvider is not mounted');
    },
  };
}
