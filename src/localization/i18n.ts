import { createInstance, type i18n } from 'i18next';

import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/domain/settings';

import { en } from './resources/en';
import { tr } from './resources/tr';

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every valid translation key, derived from the English resource. */
export type TranslationKey = Paths<typeof en>;
export type Translate = (key: TranslationKey) => string;

/** Language names shown in the language setting, each in its own language (not translated). */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
};

/** Creates a synchronous i18next instance with all bundled resources and English fallback. */
export function createI18n(): i18n {
  const instance = createInstance();
  void instance.init({
    resources: { en: { translation: en }, tr: { translation: tr } },
    lng: FALLBACK_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: { escapeValue: false }, // React Native renders text, not HTML.
    initAsync: false,
    returnNull: false,
    returnEmptyString: false, // an empty translation also falls back to English
  });
  return instance;
}

/** A translate function bound to one language; missing keys fall back to English (O-034). */
export function translatorFor(instance: i18n, language: SupportedLanguage): Translate {
  const fixed = instance.getFixedT(language);
  return (key) => fixed(key) as string;
}
