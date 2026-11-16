import { isIsoDate, localDateTimeToUtc, nextOccurrence, toIsoDate, utcToLocal } from '../dates';
import { validateLocation, validatePrice, validateSchedule, type Schedule } from '../entries';
import { LIMITS } from '../limits';
import { currencyDigits, formatAmountInput, parseAmount } from '../money';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
};

describe('calendar dates', () => {
  it('accepts only real calendar dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('16.11.2026')).toBe(false);
  });

  it('round-trips a local date and time through UTC', () => {
    const instant = localDateTimeToUtc('2026-11-16', '09:30');
    expect(utcToLocal(instant)).toEqual({ date: '2026-11-16', time: '09:30' });
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('nextOccurrence (O-024)', () => {
  it('returns the start itself when it is not yet past', () => {
    expect(nextOccurrence('2026-12-01', 'NONE', '2026-11-16')).toBe('2026-12-01');
    expect(nextOccurrence('2026-11-16', 'WEEKLY', '2026-11-16')).toBe('2026-11-16');
  });

  it('returns null for a past date that does not repeat', () => {
    expect(nextOccurrence('2026-11-01', 'NONE', '2026-11-16')).toBeNull();
  });

  it('repeats weekly', () => {
    expect(nextOccurrence('2026-11-02', 'WEEKLY', '2026-11-16')).toBe('2026-11-16');
    expect(nextOccurrence('2026-11-02', 'WEEKLY', '2026-11-17')).toBe('2026-11-23');
  });

  it('moves monthly dates on the 29th to 31st to the last day of shorter months', () => {
    expect(nextOccurrence('2026-01-31', 'MONTHLY', '2026-02-01')).toBe('2026-02-28');
    expect(nextOccurrence('2026-01-31', 'MONTHLY', '2026-03-01')).toBe('2026-03-31');
    expect(nextOccurrence('2026-01-31', 'MONTHLY', '2026-04-15')).toBe('2026-04-30');
    expect(nextOccurrence('2026-01-30', 'MONTHLY', '2028-02-01')).toBe('2028-02-29');
  });

  it('moves a yearly 29 February to 28 February in common years', () => {
    expect(nextOccurrence('2028-02-29', 'YEARLY', '2029-01-01')).toBe('2029-02-28');
    expect(nextOccurrence('2028-02-29', 'YEARLY', '2031-03-01')).toBe('2032-02-29');
    expect(nextOccurrence('2020-11-16', 'YEARLY', '2026-11-17')).toBe('2027-11-16');
  });
});

describe('validateSchedule (O-024)', () => {
  const none: Schedule = {
    dateStart: null,
    dateEnd: null,
    startsAtUtc: null,
    endsAtUtc: null,
    recurrence: 'NONE',
  };
  const at = (time: string) => localDateTimeToUtc('2026-11-16', time);

  it('accepts a full timed range', () => {
    const schedule = {
      dateStart: '2026-11-16',
      dateEnd: '2026-11-17',
      startsAtUtc: at('10:00'),
      endsAtUtc: at('12:00'),
      recurrence: 'NONE' as const,
    };
    expect(validateSchedule(schedule)).toEqual(schedule);
  });

  it.each([
    ['an invalid date', { dateStart: '2026-02-30' }, 'invalid-date'],
    ['an end without a start', { dateEnd: '2026-11-16' }, 'invalid-date-range'],
    [
      'an end before the start',
      { dateStart: '2026-11-16', dateEnd: '2026-11-15' },
      'invalid-date-range',
    ],
    ['a time without a date', { startsAtUtc: '2026-11-16T10:00:00.000Z' }, 'invalid-date'],
    ['repeating without a date', { recurrence: 'WEEKLY' }, 'invalid-recurrence'],
    [
      'repeating with a time',
      { dateStart: '2026-11-16', startsAtUtc: '2026-11-16T10:00:00.000Z', recurrence: 'YEARLY' },
      'invalid-recurrence',
    ],
    ['an unknown repeat', { dateStart: '2026-11-16', recurrence: 'DAILY' }, 'invalid-recurrence'],
  ])('rejects %s', (_, changes, expected) => {
    expect(code(() => validateSchedule({ ...none, ...changes } as Schedule))).toBe(expected);
  });
});

describe('prices (O-010)', () => {
  it('knows currency minor units', () => {
    expect(currencyDigits('EUR')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
  });

  it.each([
    ['12', 2, 1200],
    ['12.5', 2, 1250],
    ['12,50', 2, 1250],
    ['1.250,50', 2, 125050],
    ['1,250.50', 2, 125050],
    ['1.500', 2, 150000],
    ['1 500', 2, 150000],
    ['1.250.000', 2, 125000000],
    ['1500', 0, 1500],
    ['0', 2, 0],
  ])('parses %s with %i decimals as %i', (text, digits, minor) => {
    expect(parseAmount(text, digits)).toBe(minor);
  });

  it.each(['', 'abc', '-5', '12.', '12.345.6', '1.2345', '1e5'])('rejects "%s"', (text) => {
    expect(code(() => parseAmount(text, 2))).toBe('invalid-price');
  });

  it('formats minor units back for editing', () => {
    expect(formatAmountInput(125050, 2, ',')).toBe('1250,50');
    expect(formatAmountInput(5, 2, '.')).toBe('0.05');
    expect(formatAmountInput(1500, 0, '.')).toBe('1500');
  });

  it('requires both an amount and a currency, or neither', () => {
    expect(validatePrice({ priceMinor: null, currencyCode: null })).toEqual({
      priceMinor: null,
      currencyCode: null,
    });
    expect(validatePrice({ priceMinor: 100, currencyCode: 'eur' })).toEqual({
      priceMinor: 100,
      currencyCode: 'EUR',
    });
    expect(code(() => validatePrice({ priceMinor: 100, currencyCode: null }))).toBe(
      'invalid-currency',
    );
    expect(code(() => validatePrice({ priceMinor: null, currencyCode: 'EUR' }))).toBe(
      'invalid-price',
    );
    expect(code(() => validatePrice({ priceMinor: -1, currencyCode: 'EUR' }))).toBe(
      'invalid-price',
    );
    expect(code(() => validatePrice({ priceMinor: 100, currencyCode: 'EURO' }))).toBe(
      'invalid-currency',
    );
  });
});

describe('validateLocation (O-011, O-027)', () => {
  it('trims, empties to null, and enforces the limit', () => {
    expect(validateLocation('  Synthetic hall  ')).toBe('Synthetic hall');
    expect(validateLocation('   ')).toBeNull();
    expect(code(() => validateLocation('x'.repeat(LIMITS.location + 1)))).toBe('location-too-long');
  });
});
