/**
 * Rule violations reported by domain validation and repositories. The UI maps `code` to a
 * translated message; `message` is for developers and never contains user content.
 */
export type DomainErrorCode =
  | 'name-required'
  | 'name-too-long'
  | 'title-required'
  | 'title-too-long'
  | 'description-too-long'
  | 'invalid-color'
  | 'invalid-icon'
  | 'invalid-template'
  /** A status that the entry's template does not offer (O-021). */
  | 'invalid-status'
  | 'invalid-priority'
  /** Not a calendar date, or a time without a date. */
  | 'invalid-date'
  /** An end before its start, or an end without a start. */
  | 'invalid-date-range'
  /** Repeating needs a date, and applies to all-day dates only (O-024). */
  | 'invalid-recurrence'
  | 'invalid-price'
  | 'invalid-currency'
  | 'location-too-long'
  /** Links are web addresses only (http, https). */
  | 'invalid-url'
  | 'url-too-long'
  | 'too-many-links'
  | 'tag-required'
  | 'tag-too-long'
  /** An entry holds at most the per-entry photo limit (O-027). */
  | 'too-many-photos'
  | 'not-found'
  /** Built-in rows cannot be renamed or deleted (O-041, FR-025). */
  | 'built-in'
  /** A type or category in use cannot be deleted (O-006, O-014). */
  | 'in-use'
  /** An archived type cannot be chosen for a new or changed collection (O-025). */
  | 'archived'
  /** An archived collection accepts no new entries (O-025). */
  | 'collection-archived'
  /** An archived category is not offered for new or moved entries (O-025). */
  | 'category-archived'
  | 'invalid-order';

/** Numbers shown in the message, such as a limit (`{{max}}`). Never user content. */
export type DomainErrorValues = Readonly<Record<string, number>>;

export class DomainError extends Error {
  readonly values: DomainErrorValues;

  /** `detail` is either a developer message or the values the translated message shows. */
  constructor(
    readonly code: DomainErrorCode,
    detail?: string | DomainErrorValues,
  ) {
    super(typeof detail === 'string' ? detail : code);
    this.name = 'DomainError';
    this.values = typeof detail === 'object' ? detail : {};
  }
}
