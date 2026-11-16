import type { TemplateKey } from './catalog';
import { isIsoDate } from './dates';
import type { EntryPlacement } from './entry-placement';
import {
  ENTRY_STATUSES,
  PRIORITIES,
  RECURRENCES,
  templateRule,
  type EntryStatus,
  type Priority,
  type Recurrence,
} from './entry-templates';
import { DomainError } from './errors';
import { codePoints, LIMITS } from './limits';
import { validateCurrencyCode } from './money';

/** The primary information record (DATABASE_DESIGN §3.5). */
export type Entry = {
  id: string;
  placement: EntryPlacement;
  title: string;
  description: string | null;
  /** Required for templates with statuses; null for the others and the Inbox (O-021). */
  status: EntryStatus | null;
  priority: Priority | null;
  /** All-day date, `YYYY-MM-DD` (due, target, or event date by template). */
  dateStart: string | null;
  dateEnd: string | null;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  recurrence: Recurrence;
  /** Non-negative minor units with an ISO 4217 code (O-010). */
  priceMinor: number | null;
  currencyCode: string | null;
  locationText: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  /** Set while the status is one of the template's done statuses (O-021). */
  completedAt: string | null;
};

export function isEntryStatus(value: unknown): value is EntryStatus {
  return typeof value === 'string' && (ENTRY_STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

/** Trims an entry title and checks it is non-empty and within the limit (O-027). */
export function validateTitle(input: string): string {
  const title = input.trim();
  if (title.length === 0) throw new DomainError('title-required');
  if (codePoints(title) > LIMITS.title) {
    throw new DomainError('title-too-long', { max: LIMITS.title });
  }
  return title;
}

export function validatePriority(input: string | null | undefined): Priority | null {
  if (input === null || input === undefined) return null;
  if (!isPriority(input)) throw new DomainError('invalid-priority');
  return input;
}

/** The date and time fields of an entry, validated together because they depend on each other. */
export type Schedule = Pick<
  Entry,
  'dateStart' | 'dateEnd' | 'startsAtUtc' | 'endsAtUtc' | 'recurrence'
>;

const isInstant = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value));

/**
 * Checks an entry's dates (O-024): calendar dates, an end never before its start, times only
 * with a date, and repeating only for all-day dates.
 */
export function validateSchedule(schedule: Schedule): Schedule {
  const { dateStart, dateEnd, startsAtUtc, endsAtUtc, recurrence } = schedule;
  if (dateStart !== null && !isIsoDate(dateStart)) throw new DomainError('invalid-date');
  if (dateEnd !== null) {
    if (!isIsoDate(dateEnd)) throw new DomainError('invalid-date');
    if (dateStart === null || dateEnd < dateStart) throw new DomainError('invalid-date-range');
  }
  if (startsAtUtc !== null && (!isInstant(startsAtUtc) || dateStart === null)) {
    throw new DomainError('invalid-date');
  }
  if (endsAtUtc !== null) {
    if (!isInstant(endsAtUtc)) throw new DomainError('invalid-date');
    if (startsAtUtc === null || Date.parse(endsAtUtc) < Date.parse(startsAtUtc)) {
      throw new DomainError('invalid-date-range');
    }
  }
  if (!(RECURRENCES as readonly string[]).includes(recurrence)) {
    throw new DomainError('invalid-recurrence');
  }
  if (recurrence !== 'NONE' && (dateStart === null || startsAtUtc !== null)) {
    throw new DomainError('invalid-recurrence');
  }
  return schedule;
}

/** A price needs both an amount in minor units and a currency code, or neither (O-010). */
export function validatePrice(price: Pick<Entry, 'priceMinor' | 'currencyCode'>) {
  const { priceMinor, currencyCode } = price;
  if (priceMinor === null && currencyCode === null) return price;
  if (priceMinor === null || !Number.isSafeInteger(priceMinor) || priceMinor < 0) {
    throw new DomainError('invalid-price');
  }
  if (currencyCode === null) throw new DomainError('invalid-currency');
  return { priceMinor, currencyCode: validateCurrencyCode(currencyCode) };
}

/** Trims optional location text; blank becomes null (O-011, O-027). */
export function validateLocation(input: string | null | undefined): string | null {
  const location = input?.trim() ?? '';
  if (location.length === 0) return null;
  if (codePoints(location) > LIMITS.location) {
    throw new DomainError('location-too-long', { max: LIMITS.location });
  }
  return location;
}

/**
 * The status an entry gets (O-021).
 * - Templates without statuses, and the Inbox, always get null.
 * - A requested status must be one the template offers.
 * - Otherwise `keep` (the current status, passed only while the template is unchanged) stays if
 *   still offered; a new entry or a template change gets the template's default.
 */
export function resolveStatus(
  template: TemplateKey | null,
  requested: string | null | undefined,
  keep: EntryStatus | null = null,
): EntryStatus | null {
  const rule = templateRule(template);
  if (rule.statuses.length === 0) {
    if (requested !== undefined && requested !== null) throw new DomainError('invalid-status');
    return null;
  }
  if (requested !== undefined) {
    if (!isEntryStatus(requested) || !rule.statuses.includes(requested)) {
      throw new DomainError('invalid-status');
    }
    return requested;
  }
  if (keep && rule.statuses.includes(keep)) return keep;
  return rule.defaultStatus;
}

/**
 * `completed_at` for a status (O-021): set when the status becomes a done status, kept while it
 * stays the same done status, and cleared otherwise.
 */
export function completedAtFor(
  template: TemplateKey | null,
  status: EntryStatus | null,
  previous: { status: EntryStatus | null; completedAt: string | null },
  now: string,
): string | null {
  if (!status || !templateRule(template).doneStatuses.includes(status)) return null;
  if (previous.status === status && previous.completedAt) return previous.completedAt;
  return now;
}
