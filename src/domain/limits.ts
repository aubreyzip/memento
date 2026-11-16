/**
 * Field and size limits (O-027), defined once (O-056). Validation, inputs, and error messages
 * read from here, so changing a limit is a one-line change. Lengths count Unicode code points.
 */
export const LIMITS = {
  /** Collection, type, and category names. */
  name: 60,
  /** Entry titles. */
  title: 160,
  /** Descriptions of collections and entries. */
  description: 10_000,
  tag: 40,
  linksPerEntry: 20,
  url: 2_048,
  photosPerEntry: 10,
  /** Largest image accepted before it is re-encoded (O-031). */
  imageIntakeBytes: 20 * 1024 * 1024,
} as const;

export const codePoints = (text: string) => [...text].length;
