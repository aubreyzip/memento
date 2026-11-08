import type { PartialTranslationResource } from './en';

/**
 * Turkish UI strings. DRAFT: needs review by a native speaker before release
 * (RELEASE_CHECKLIST "English and Turkish UI have been reviewed").
 *
 * Intentionally missing (falls back to English, O-034):
 * - `app.tagline`: the Turkish tagline is brand copy and has not been decided (O-045).
 */
export const tr: PartialTranslationResource = {
  common: {
    close: 'Kapat',
    comingSoon: 'Yakında.',
  },
  nav: {
    home: 'Ana Sayfa',
    collections: 'Koleksiyonlar',
    search: 'Ara',
    settings: 'Ayarlar',
  },
  quickAdd: {
    label: 'Hızlı Ekle',
  },
  capture: {
    title: 'Hızlı Kayıt',
  },
  settings: {
    appearance: {
      label: 'Görünüm',
      system: 'Sistem',
      light: 'Açık',
      dark: 'Koyu',
    },
    language: {
      label: 'Dil',
      system: 'Sistem',
    },
  },
};
