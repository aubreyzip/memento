import type { TemplateKey } from './catalog';

/**
 * What each category template offers (B-005, O-021, O-022), defined once (O-056). The entry
 * form, validation, and tests all read this table, so changing a template's statuses or fields
 * is a change here only. Stored values are the stable codes below, never labels, so relabeling
 * needs no migration; removing a code that stored rows still use does.
 */

/** Every status code any template uses. Labels come from translations (`entries.status.*`). */
export const ENTRY_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'COMPLETED',
  'SAVED',
  'PLANNED',
  'PURCHASED',
  'IDEA',
  'CANCELLED',
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Repeat options for all-day dates and their reminders (O-024). */
export const RECURRENCES = ['NONE', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

/**
 * Template-dependent fields (O-022 matrix). Title, description, links, photos, tags, and
 * reminders apply to every template and the Inbox, so they are not listed here.
 */
export const TEMPLATE_FIELDS = [
  'status',
  'priority',
  'date',
  'dateRange',
  'time',
  'price',
  'location',
] as const;
export type TemplateField = (typeof TEMPLATE_FIELDS)[number];

export type TemplateRule = {
  /** Fields the editor offers when empty. Stored values outside this list are still shown. */
  fields: readonly TemplateField[];
  /** Offered statuses in display order; empty when the template has no status. */
  statuses: readonly EntryStatus[];
  /** Status given to a new entry, or after moving into this template (O-021). */
  defaultStatus: EntryStatus | null;
  /** Statuses that set `completed_at` (O-021). */
  doneStatuses: readonly EntryStatus[];
};

const NO_STATUS = { statuses: [], defaultStatus: null, doneStatuses: [] } as const;

export const TEMPLATE_RULES: Readonly<Record<TemplateKey, TemplateRule>> = {
  NOTE: { fields: [], ...NO_STATUS },
  TASK: {
    fields: ['status', 'priority', 'date'],
    statuses: ['TODO', 'IN_PROGRESS', 'COMPLETED'],
    defaultStatus: 'TODO',
    doneStatuses: ['COMPLETED'],
  },
  WISHLIST: {
    fields: ['status', 'priority', 'date', 'price'],
    statuses: ['SAVED', 'PLANNED', 'PURCHASED'],
    defaultStatus: 'SAVED',
    doneStatuses: ['PURCHASED'],
  },
  EVENT: {
    fields: ['status', 'priority', 'date', 'dateRange', 'time', 'price', 'location'],
    statuses: ['IDEA', 'PLANNED', 'COMPLETED', 'CANCELLED'],
    defaultStatus: 'IDEA',
    doneStatuses: ['COMPLETED'],
  },
  PREFERENCE: { fields: [], ...NO_STATUS },
};

/** The rule for an entry's template; Inbox entries (no category) have no template fields. */
export function templateRule(template: TemplateKey | null): TemplateRule {
  return template ? TEMPLATE_RULES[template] : { fields: [], ...NO_STATUS };
}

export function offersField(template: TemplateKey | null, field: TemplateField): boolean {
  return templateRule(template).fields.includes(field);
}
