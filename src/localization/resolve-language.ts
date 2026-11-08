import {
  FALLBACK_LANGUAGE,
  isSupportedLanguage,
  type LanguagePreference,
  type SupportedLanguage,
} from '@/domain/settings';

/**
 * Maps the language preference and the device's primary language to the UI language (O-034).
 * System follows the device's primary language; an unsupported or unknown language shows English.
 * `deviceLanguageCode` is an ISO 639 code such as "tr" (from Expo Localization `languageCode`).
 */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguageCode: string | null | undefined,
): SupportedLanguage {
  if (preference !== 'system') {
    return preference;
  }
  const code = deviceLanguageCode?.toLowerCase();
  return isSupportedLanguage(code) ? code : FALLBACK_LANGUAGE;
}
