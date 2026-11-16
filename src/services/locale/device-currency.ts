import { getLocales } from 'expo-localization';

/**
 * The currency of the device region, used as the default for new prices (O-010). Empty when the
 * region has none, so the user picks one instead of the app assuming a currency.
 */
export function deviceCurrencyCode(): string {
  try {
    return getLocales()[0]?.currencyCode ?? '';
  } catch {
    return '';
  }
}
