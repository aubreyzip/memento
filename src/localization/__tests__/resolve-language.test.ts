import { resolveLanguage } from '../resolve-language';

describe('resolveLanguage (O-034)', () => {
  it.each([
    // Explicit choices ignore the device language.
    ['en', 'tr', 'en'],
    ['tr', 'en', 'tr'],
    ['tr', null, 'tr'],
    // System follows the device's primary language.
    ['system', 'en', 'en'],
    ['system', 'tr', 'tr'],
    ['system', 'TR', 'tr'],
    // Unsupported or unknown device language falls back to English (T-032).
    ['system', 'de', 'en'],
    ['system', 'az', 'en'],
    ['system', null, 'en'],
    ['system', undefined, 'en'],
    ['system', '', 'en'],
  ] as const)('preference %s with device %p shows %s', (preference, device, expected) => {
    expect(resolveLanguage(preference, device)).toBe(expected);
  });
});
