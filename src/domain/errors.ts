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
