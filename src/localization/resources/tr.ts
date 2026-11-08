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
    cancel: 'Vazgeç',
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
  startup: {
    loading: 'Memento açılıyor',
    recovery: {
      title: 'Kayıtlı verileriniz bu cihazda açılamıyor',
      body: 'Memento kayıtlı veriler buldu, ancak bunları okumak için gereken anahtar bu cihazda yok. Bu durum bir telefon yedeğini geri yükledikten veya yeni bir telefona geçtikten sonra oluşabilir. Okunamayan veriler silinmedi, saklandı.',
      restoreNote: 'Memento yedeğinden geri yükleme sonraki bir sürümde kullanılabilecek.',
      startFresh: 'Sıfırdan başla',
      confirmTitle: 'Sıfırdan başlansın mı?',
      confirmBody:
        'Memento veri olmadan başlayacak. Okunamayan veriler bu cihazda kalır ve silinmez.',
    },
    error: {
      title: 'Memento başlatılamıyor',
      retry: 'Tekrar dene',
      'cipher-unavailable':
        'Bu Memento sürümü verilerinizi şifreleyemediği için açılmayacak. Resmî bir sürüm yükleyin.',
      'key-store-unavailable':
        'Güvenli depolama şu anda kullanılamıyor. Cihazınızın kilidini açıp tekrar deneyin.',
      'key-store-failed':
        'Memento şifreleme anahtarını güvenli şekilde saklayamadı. Hiç veri oluşturulmadı.',
      'newer-than-app':
        "Verileriniz Memento'nun daha yeni bir sürümüyle kaydedildi. Açmak için uygulamayı güncelleyin.",
      'migration-failed': 'Memento verilerini güncelleyemedi. Verileriniz değiştirilmedi.',
      'open-failed': 'Memento verilerini açamadı. Verileriniz değiştirilmedi.',
    },
  },
  builtIns: {
    collectionTypes: {
      PERSON: 'Kişi',
      SPACE: 'Alan',
      PROJECT: 'Proje',
      EVENT: 'Etkinlik',
      GENERAL: 'Genel',
    },
    categories: {
      WISHLIST: 'İstek Listesi',
      EXPERIENCES: 'Deneyimler',
      PREFERENCES: 'Tercihler',
      HOME_IMPROVEMENTS: 'Ev ve İyileştirmeler',
      TASKS_REPAIRS: 'Görevler ve Onarımlar',
      IMPORTANT_DATES: 'Önemli Tarihler',
      GENERAL_NOTES: 'Genel Notlar',
    },
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
