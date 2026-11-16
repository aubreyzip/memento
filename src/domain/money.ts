import { DomainError } from './errors';

/**
 * Prices are non-negative integers in the currency's minor unit with an ISO 4217 code (O-010),
 * never floating point.
 */

const CURRENCY = /^[A-Z]{3}$/;

export const isCurrencyCode = (value: string) => CURRENCY.test(value);

/** Uppercases and checks a currency code. */
export function validateCurrencyCode(input: string): string {
  const code = input.trim().toUpperCase();
  if (!isCurrencyCode(code)) throw new DomainError('invalid-currency');
  return code;
}

/** Minor-unit digits of a currency (2 for EUR, 0 for JPY), from the platform's ISO data. */
export function currencyDigits(code: string): number {
  try {
    const digits = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
    }).resolvedOptions().maximumFractionDigits;
    return typeof digits === 'number' ? digits : 2;
  } catch {
    return 2;
  }
}

/**
 * Parses a typed amount into minor units. Accepts `.` or `,` as the decimal separator and the
 * other as grouping ("1.250,50" and "1,250.50"); a lone separator followed by exactly three
 * digits in a currency with fewer decimals is grouping ("1.500" is 1500).
 */
export function parseAmount(input: string, digits: number): number {
  const text = input.replace(/[\s  ']/g, '');
  if (!/^\d[\d.,]*$/.test(text) || /[.,]$/.test(text)) throw new DomainError('invalid-price');

  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  let whole = text;
  let fraction = '';
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = Math.max(lastDot, lastComma);
    whole = text.slice(0, decimal).replace(/[.,]/g, '');
    fraction = text.slice(decimal + 1);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? '.' : ',';
    const pieces = text.split(separator);
    const tail = pieces[pieces.length - 1];
    const isGrouping = pieces.length > 2 || (tail.length === 3 && digits < 3);
    if (isGrouping) {
      if (pieces.slice(1).some((piece) => piece.length !== 3)) {
        throw new DomainError('invalid-price');
      }
      whole = pieces.join('');
    } else {
      whole = pieces[0];
      fraction = tail;
    }
  }
  if (fraction.length > digits) throw new DomainError('invalid-price');

  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
  if (!Number.isSafeInteger(minor)) throw new DomainError('invalid-price');
  return minor;
}

/** Minor units as an editable amount, with the given decimal separator ("12,50"). */
export function formatAmountInput(minor: number, digits: number, decimalSeparator: string) {
  if (digits === 0) return String(minor);
  const text = String(minor).padStart(digits + 1, '0');
  return `${text.slice(0, -digits)}${decimalSeparator}${text.slice(-digits)}`;
}
