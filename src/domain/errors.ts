/**
 * Rule violations reported by domain validation and repositories. The UI maps `code` to a
 * translated message; `message` is for developers and never contains user content.
 */
export type DomainErrorCode =
  | 'name-required'
  | 'name-too-long'
  | 'description-too-long'
  | 'invalid-color'
  | 'invalid-icon'
  | 'invalid-template'
  | 'not-found'
  /** Built-in rows cannot be renamed or deleted (O-041, FR-025). */
  | 'built-in'
  /** A type or category in use cannot be deleted (O-006, O-014). */
  | 'in-use'
  /** An archived type or category cannot be chosen for a new or changed row (O-025). */
  | 'archived'
  | 'invalid-order';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
