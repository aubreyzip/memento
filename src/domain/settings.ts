/**
 * User preferences stored in `app_settings` (DATABASE_DESIGN §3.1).
 * Values are machine values; UI labels come from translation resources.
 */

export const APPEARANCE_PREFERENCES = ['system', 'light', 'dark'] as const;
export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[number];

/** UI languages shipped in V1 (D-013). */
export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
/** Used when the device language is unsupported and for missing translations (O-034). */
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

/** Language setting options: System, English, Türkçe (O-034). */
export const LANGUAGE_PREFERENCES = ['system', ...SUPPORTED_LANGUAGES] as const;
export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];

/**
 * Default currency for new prices (O-010): an ISO 4217 code, or '' to follow the device region.
 * Common codes offered first in Settings are a config list (O-056); any code can be typed.
 */
export const DEVICE_CURRENCY = '';
export const COMMON_CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const;
export type CurrencyPreference = string;

/** Typed map of every setting key to its value type. */
export type SettingValues = {
  appearance: AppearancePreference;
  language: LanguagePreference;
  defaultCurrency: CurrencyPreference;
};
export type SettingKey = keyof SettingValues;

/** Defaults used when nothing is stored, and before the database opens (O-044). */
export const SETTING_DEFAULTS: SettingValues = {
  appearance: 'system',
  language: 'system',
  defaultCurrency: DEVICE_CURRENCY,
};

function isOneOf<T extends string>(options: readonly T[]) {
  return (value: unknown): value is T =>
    typeof value === 'string' && (options as readonly string[]).includes(value);
}

export const isAppearancePreference = isOneOf(APPEARANCE_PREFERENCES);
export const isLanguagePreference = isOneOf(LANGUAGE_PREFERENCES);
export const isSupportedLanguage = isOneOf(SUPPORTED_LANGUAGES);
export const isCurrencyPreference = (value: unknown): value is CurrencyPreference =>
  typeof value === 'string' && (value === DEVICE_CURRENCY || /^[A-Z]{3}$/.test(value));

/** Validators for values read back from storage; unknown or corrupt values fall back to defaults. */
export const SETTING_VALIDATORS: {
  [K in SettingKey]: (value: unknown) => value is SettingValues[K];
} = {
  appearance: isAppearancePreference,
  language: isLanguagePreference,
  defaultCurrency: isCurrencyPreference,
};
