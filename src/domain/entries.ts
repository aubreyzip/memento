import type { TemplateKey } from './catalog';
import type { EntryPlacement } from './entry-placement';
import {
  ENTRY_STATUSES,
  PRIORITIES,
  templateRule,
  type EntryStatus,
  type Priority,
  type Recurrence,
} from './entry-templates';
import { DomainError } from './errors';
import { codePoints, LIMITS } from './limits';

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
