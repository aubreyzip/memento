import { createI18n, LANGUAGE_NAMES, translatorFor } from '../i18n';
import { en } from '../resources/en';
import { tr } from '../resources/tr';

function leafKeys(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : leafKeys(value, `${prefix}${key}.`),
  );
}

/**
 * Turkish strings that are knowingly missing and fall back to English. Adding an English key
 * without a Turkish translation fails this test until the key is translated or listed here.
 */
const KNOWN_MISSING_TURKISH = ['app.tagline'];

describe('translations', () => {
  const i18n = createI18n();

  it('translates English and Turkish', () => {
    expect(translatorFor(i18n, 'en')('settings.language.label')).toBe('Language');
    expect(translatorFor(i18n, 'tr')('settings.language.label')).toBe('Dil');
  });

  it('falls back to English for a missing Turkish string (O-034, T-033)', () => {
    expect(translatorFor(i18n, 'tr')('app.tagline')).toBe(en.app.tagline);
  });

  it('switching language does not change other translators (immediate, isolated)', () => {
    const english = translatorFor(i18n, 'en');
    const turkish = translatorFor(i18n, 'tr');
    expect(english('settings.appearance.dark')).toBe('Dark');
    expect(turkish('settings.appearance.dark')).toBe('Koyu');
    expect(english('settings.appearance.dark')).toBe('Dark');
  });

  it('Turkish has no keys that English lacks', () => {
    const english = new Set(leafKeys(en));
    expect(leafKeys(tr).filter((key) => !english.has(key))).toEqual([]);
  });

  it('every missing Turkish string is explicitly acknowledged', () => {
    const turkish = new Set(leafKeys(tr));
    expect(leafKeys(en).filter((key) => !turkish.has(key))).toEqual(KNOWN_MISSING_TURKISH);
  });

  it('has no empty translations', () => {
    for (const resource of [en, tr]) {
      const values = leafKeys(resource).map((key) =>
        key
          .split('.')
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], resource),
      );
      expect(values.every((value) => typeof value === 'string' && value.trim().length > 0)).toBe(
        true,
      );
    }
  });

  it('shows each language in its own language', () => {
    expect(LANGUAGE_NAMES).toEqual({ en: 'English', tr: 'Türkçe' });
  });
});
