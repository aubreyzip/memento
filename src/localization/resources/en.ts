/**
 * English UI strings: the source of truth for translation keys and the fallback language (O-034).
 * "Memento" is the product name and is not translated.
 */
export const en = {
  app: {
    tagline: 'Remember the little things.',
  },
  common: {
    cancel: 'Cancel',
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
  startup: {
    loading: 'Opening Memento',
    recovery: {
      title: "Your saved data can't be opened on this device",
      body: 'Memento found saved data, but the key needed to read it is not on this device. This can happen after restoring a phone backup or moving to a new phone. The unreadable data has been kept, not deleted.',
      restoreNote: 'Restoring from a Memento backup will be available in a later version.',
      startFresh: 'Start fresh',
      confirmTitle: 'Start fresh?',
      confirmBody:
        'Memento will start with no data. The unreadable data stays on this device and is not deleted.',
    },
    error: {
      title: "Memento can't start",
      retry: 'Try again',
      'cipher-unavailable':
        'This build of Memento cannot encrypt your data, so it will not open. Install an official build.',
      'key-store-unavailable':
        'Secure storage is not available right now. Unlock your device and try again.',
      'key-store-failed':
        'Memento could not store its encryption key securely. No data was created.',
      'newer-than-app':
        'Your data was saved by a newer version of Memento. Update the app to open it.',
      'migration-failed': 'Memento could not update its data. Your data was not changed.',
      'open-failed': 'Memento could not open its data. Your data was not changed.',
    },
  },
  builtIns: {
    collectionTypes: {
      PERSON: 'Person',
      SPACE: 'Space',
      PROJECT: 'Project',
      EVENT: 'Event',
      GENERAL: 'General',
    },
    categories: {
      WISHLIST: 'Wishlist',
      EXPERIENCES: 'Experiences',
      PREFERENCES: 'Preferences',
      HOME_IMPROVEMENTS: 'Home & Improvements',
      TASKS_REPAIRS: 'Tasks & Repairs',
      IMPORTANT_DATES: 'Important Dates',
      GENERAL_NOTES: 'General Notes',
    },
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
