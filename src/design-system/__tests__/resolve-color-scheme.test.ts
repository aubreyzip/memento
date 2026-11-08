import { resolveColorScheme } from '../resolve-color-scheme';

describe('resolveColorScheme', () => {
  it.each([
    ['light', 'dark', 'light'],
    ['light', null, 'light'],
    ['dark', 'light', 'dark'],
    ['dark', null, 'dark'],
    ['system', 'dark', 'dark'],
    ['system', 'light', 'light'],
    ['system', null, 'light'],
    ['system', undefined, 'light'],
  ] as const)('preference %s with OS %s renders %s', (preference, os, expected) => {
    expect(resolveColorScheme(preference, os)).toBe(expected);
  });
});
