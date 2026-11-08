import {
  FALLBACK_LANGUAGE,
  isAppearancePreference,
  isLanguagePreference,
  LANGUAGE_PREFERENCES,
  SETTING_DEFAULTS,
} from '../settings';

describe('setting defaults', () => {
  it('default to System (FR-003, FR-004, O-044)', () => {
    expect(SETTING_DEFAULTS).toEqual({ appearance: 'system', language: 'system' });
  });

  it('falls back to English', () => {
    expect(FALLBACK_LANGUAGE).toBe('en');
  });
});

describe('appearance setting', () => {
  it.each(['system', 'light', 'dark'])('accepts %s', (value) => {
    expect(isAppearancePreference(value)).toBe(true);
  });

  it.each(['', 'Dark', 'auto', null, undefined, 1, {}])('rejects %p', (value) => {
    expect(isAppearancePreference(value)).toBe(false);
  });
});

describe('language setting', () => {
  it('offers exactly System, English, Türkçe (O-034)', () => {
    expect(LANGUAGE_PREFERENCES).toEqual(['system', 'en', 'tr']);
  });

  it.each(['de', 'EN', 'en-US', '', null, 0])('rejects %p', (value) => {
    expect(isLanguagePreference(value)).toBe(false);
  });
});
