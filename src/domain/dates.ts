import type { Recurrence } from './entry-templates';

/**
 * All-day dates are calendar dates (`YYYY-MM-DD`) with no time zone (DATABASE_DESIGN §3.5).
 * Timed values are UTC instants, entered and shown in the device time zone.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

type DateParts = { year: number; month: number; day: number };

export const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

function parts(date: string): DateParts | null {
  const match = ISO_DATE.exec(date);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const format = ({ year, month, day }: DateParts) => `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

/** A real calendar date in `YYYY-MM-DD` form. */
export const isIsoDate = (value: string) => parts(value) !== null;

/** A 24-hour local time in `HH:MM` form. */
export const isLocalTime = (value: string) => TIME.test(value);

/** The local calendar date of a `Date`, as `YYYY-MM-DD`. */
export const toIsoDate = (date: Date) =>
  format({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });

/** A `YYYY-MM-DD` date as a local `Date` at midnight (for pickers and formatting). */
export function localDate(date: string): Date {
  const p = parts(date);
  if (!p) throw new RangeError('not a calendar date');
  return new Date(p.year, p.month - 1, p.day);
}

/** A local date and `HH:MM` time in the device time zone, as a UTC ISO-8601 instant. */
export function localDateTimeToUtc(date: string, time: string): string {
  const p = parts(date);
  const t = TIME.exec(time);
  if (!p || !t) throw new RangeError('not a date and time');
  return new Date(p.year, p.month - 1, p.day, Number(t[1]), Number(t[2])).toISOString();
}

/** A UTC instant as the device's local date and `HH:MM` time. */
export function utcToLocal(instant: string): { date: string; time: string } {
  const d = new Date(instant);
  return { date: toIsoDate(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** The local `HH:MM` time of a `Date`. */
export const toLocalTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function addMonths(anchor: DateParts, months: number): DateParts {
  const index = anchor.year * 12 + (anchor.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  // O-024 edge rule: the 29th–31st fall on the last day of shorter months, and a yearly
  // 29 February on 28 February in common years. Each occurrence starts from the anchor day.
  return { year, month, day: Math.min(anchor.day, daysInMonth(year, month)) };
}

const dayNumber = (p: DateParts) => Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;

/**
 * The first occurrence of a repeating all-day date on or after `from` (O-024), or null when a
 * non-repeating date is already past. Invalid input gives null.
 */
export function nextOccurrence(start: string, recurrence: Recurrence, from: string): string | null {
  const anchor = parts(start);
  const after = parts(from);
  if (!anchor || !after) return null;
  if (start >= from) return start;

  switch (recurrence) {
    case 'NONE':
      return null;
    case 'WEEKLY': {
      const weeks = Math.ceil((dayNumber(after) - dayNumber(anchor)) / 7);
      const d = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day + weeks * 7));
      return format({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
    }
    case 'MONTHLY':
    case 'YEARLY': {
      const step = recurrence === 'MONTHLY' ? 1 : 12;
      const monthsApart = (after.year - anchor.year) * 12 + (after.month - anchor.month);
      let k = Math.max(0, Math.floor(monthsApart / step));
      let candidate = format(addMonths(anchor, k * step));
      while (candidate < from) candidate = format(addMonths(anchor, ++k * step));
      return candidate;
    }
  }
}
