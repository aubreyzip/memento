import type { PartialTranslationResource } from './en';

/**
 * Turkish UI strings. DRAFT: needs review by a native speaker before release
 * (RELEASE_CHECKLIST "English and Turkish UI have been reviewed").
 *
 * Intentionally missing (falls back to English, O-034):
 * Nothing at the moment. The tagline is brand copy (O-045, confirmed 16 Nov 2026).
 */
export const tr: PartialTranslationResource = {
  app: {
    tagline: 'Küçük şeyleri hatırla.',
  },
  common: {
    cancel: 'Vazgeç',
    close: 'Kapat',
    comingSoon: 'Yakında.',
    save: 'Kaydet',
    edit: 'Düzenle',
    delete: 'Sil',
    archive: 'Arşivle',
    restore: 'Geri yükle',
    builtIn: 'Yerleşik',
    archived: 'Arşivlendi',
    moveUp: '{{name}} öğesini yukarı taşı',
    moveDown: '{{name}} öğesini aşağı taşı',
  },
  errors: {
    'name-required': 'Bir ad girin.',
    'name-too-long': 'En fazla 60 karakter kullanın.',
    'description-too-long': 'En fazla 10.000 karakter kullanın.',
    'invalid-color': 'Sunulan renklerden birini seçin.',
    'invalid-icon': 'Sunulan simgelerden birini seçin.',
    'invalid-template': 'Bir şablon seçin.',
    'invalid-order': 'Sıralama kaydedilemedi. Tekrar deneyin.',
    'not-found': 'Bu öğe artık mevcut değil.',
    'built-in': 'Yerleşik öğeler yeniden adlandırılamaz veya silinemez.',
    'in-use': 'Bu öğe hâlâ kullanımda olduğu için silinemez. Bunun yerine arşivleyebilirsiniz.',
    archived: 'Bu tür arşivlenmiş. Başka bir tür seçin.',
    unknown: 'Bir sorun oluştu. Hiçbir şey değiştirilmedi. Tekrar deneyin.',
  },
  collections: {
    empty:
      'Henüz koleksiyon yok. Bir kişi, bir yer, bir proje veya başka bir şey için koleksiyon oluşturun.',
    new: 'Yeni koleksiyon',
    manageCatalog: 'Türler ve kategoriler',
    showArchived: 'Arşivlenenleri göster',
    hideArchived: 'Arşivlenenleri gizle',
    archivedHeading: 'Arşivlenen koleksiyonlar',
    noArchived: 'Arşivlenen koleksiyon yok.',
    form: {
      newTitle: 'Yeni koleksiyon',
      editTitle: 'Koleksiyonu düzenle',
      name: 'Ad',
      type: 'Tür',
      description: 'Açıklama (isteğe bağlı)',
    },
    detail: {
      archivedNotice: 'Bu koleksiyon arşivlendi. Kayıt eklemek için geri yükleyin.',
      entriesPlaceholder: 'Bu koleksiyonun kayıtları burada görünecek.',
    },
    delete: {
      title: 'Bu koleksiyon silinsin mi?',
      body: '"{{name}}" tüm kayıtlarıyla birlikte kalıcı olarak silinecek (kayıt sayısı: {{count}}). Gelen kutusundaki kayıtlar etkilenmez. Bu işlem geri alınamaz.',
    },
  },
  catalog: {
    title: 'Türler ve kategoriler',
    typesHeading: 'Koleksiyon türleri',
    categoriesHeading: 'Kategoriler',
    newType: 'Yeni tür',
    newCategory: 'Yeni kategori',
    form: {
      newType: 'Yeni koleksiyon türü',
      editType: 'Koleksiyon türünü düzenle',
      newCategory: 'Yeni kategori',
      editCategory: 'Kategoriyi düzenle',
      name: 'Ad',
      icon: 'Simge',
      color: 'Renk',
      defaultIcon: 'Varsayılan simge',
      template: 'Şablon',
      templateFixed: 'Bir kategorinin şablonu oluşturulduktan sonra değiştirilemez.',
      builtInName: 'Yerleşik adlar değiştirilemez.',
      typeArchivedHint: 'Arşivlenen türler, koleksiyon oluştururken gösterilmez.',
      categoryArchivedHint: 'Arşivlenen kategoriler, kayıt eklerken gösterilmez.',
    },
    colors: {
      none: 'Renk yok',
      burgundy: 'Bordo',
      coral: 'Mercan',
      softCoral: 'Açık mercan',
      peach: 'Şeftali',
    },
    templates: {
      NOTE: 'Not',
      TASK: 'Görev',
      WISHLIST: 'İstek listesi',
      EVENT: 'Etkinlik',
      PREFERENCE: 'Tercih',
    },
    delete: {
      typeTitle: 'Bu koleksiyon türü silinsin mi?',
      categoryTitle: 'Bu kategori silinsin mi?',
      body: '"{{name}}" kalıcı olarak silinecek. Bu işlem geri alınamaz.',
    },
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
