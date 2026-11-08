/**
 * English UI strings: the source of truth for translation keys and the fallback language (O-034).
 * "Memento" is the product name and is not translated.
 */
export const en = {
  app: {
    tagline: 'Remember the little things.',
  },
  common: {
    close: 'Close',
    comingSoon: 'Coming soon.',
  },
  nav: {
    home: 'Home',
    collections: 'Collections',
    search: 'Search',
    settings: 'Settings',
  },
  quickAdd: {
    label: 'Quick Add',
  },
  capture: {
    title: 'Quick Capture',
  },
  settings: {
    appearance: {
      label: 'Appearance',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    language: {
      label: 'Language',
      system: 'System',
    },
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

/** Shape every language must follow; other languages may omit keys (they fall back to English). */
export type TranslationResource = Widen<typeof en>;
export type PartialTranslationResource = DeepPartial<TranslationResource>;
