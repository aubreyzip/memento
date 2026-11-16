import { utcToLocal, localDateTimeToUtc } from '@/domain/dates';
import { resolveStatus, type Entry } from '@/domain/entries';
import type { EntryStatus, Priority, Recurrence } from '@/domain/entry-templates';
import type { TemplateKey } from '@/domain/catalog';
import {
  currencyDigits,
  formatAmountInput,
  parseAmount,
  validateCurrencyCode,
} from '@/domain/money';
import type { EntryChanges } from '@/repositories/entry-repository';

/**
 * What the entry form edits for template-dependent fields, in the shapes the inputs use: local
 * dates and `HH:MM` times, and the price as typed text. Conversion to stored values happens once,
 * on save, in `toEntryFields`.
 */
export type TemplateValues = {
  status: EntryStatus | null;
  priority: Priority | null;
  dateStart: string | null;
  dateEnd: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrence: Recurrence;
  amount: string;
  currencyCode: string;
  locationText: string;
};

export function initialTemplateValues(
  entry: Entry | undefined,
  template: TemplateKey | null,
  options: { defaultCurrency: string; decimalSeparator: string },
): TemplateValues {
  const currency = entry?.currencyCode ?? options.defaultCurrency;
  return {
    status: entry ? entry.status : resolveStatus(template, undefined),
    priority: entry?.priority ?? null,
    dateStart: entry?.dateStart ?? null,
    dateEnd: entry?.dateEnd ?? null,
    startTime: entry?.startsAtUtc ? utcToLocal(entry.startsAtUtc).time : null,
    endTime: entry?.endsAtUtc ? utcToLocal(entry.endsAtUtc).time : null,
    recurrence: entry?.recurrence ?? 'NONE',
    amount:
      entry?.priceMinor != null && entry.currencyCode
        ? formatAmountInput(
            entry.priceMinor,
            currencyDigits(entry.currencyCode),
            options.decimalSeparator,
          )
        : '',
    currencyCode: currency,
    locationText: entry?.locationText ?? '',
  };
}

/**
 * Stored values for the template-dependent fields. Throws a `DomainError` for a price that does
 * not parse; the repository validates the rest.
 */
export function toEntryFields(values: TemplateValues): EntryChanges {
  const { dateStart, dateEnd, startTime, endTime } = values;
  const startsAtUtc = dateStart && startTime ? localDateTimeToUtc(dateStart, startTime) : null;
  const endsAtUtc =
    startsAtUtc && endTime ? localDateTimeToUtc(dateEnd ?? dateStart!, endTime) : null;

  let priceMinor: number | null = null;
  let currencyCode: string | null = null;
  if (values.amount.trim() !== '') {
    currencyCode = validateCurrencyCode(values.currencyCode);
    priceMinor = parseAmount(values.amount, currencyDigits(currencyCode));
  }

  return {
    // No status means "the template's rule decides" (O-021).
    status: values.status ?? undefined,
    priority: values.priority,
    dateStart,
    dateEnd: dateStart ? dateEnd : null,
    startsAtUtc,
    endsAtUtc,
    recurrence: values.recurrence,
    priceMinor,
    currencyCode,
    locationText: values.locationText,
  };
}
