import type { AppearancePreference } from '@/domain/settings';

import type { ColorSchemeName } from './tokens';

/**
 * Maps the user's appearance preference and the OS scheme to the scheme to render.
 * `system` follows the OS; if the OS reports no scheme, light is used.
 */
export function resolveColorScheme(
  preference: AppearancePreference,
  systemScheme: ColorSchemeName | null | undefined,
): ColorSchemeName {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}
