import { DomainError } from './errors';
import { BUILT_IN_TABLE, builtInId } from './ids';

/** Category templates (B-005). They decide applicable fields and status behavior. */
export const TEMPLATE_KEYS = ['NOTE', 'TASK', 'WISHLIST', 'EVENT', 'PREFERENCE'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === 'string' && (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export type CollectionType = {
  id: string;
  /** Stable key for built-in types; null for custom types. */
  key: string | null;
  /** User-entered name for custom types; null for built-ins (localized via translation keys). */
  name: string | null;
  /** Icon name from the approved set (O-046); null shows the default icon. */
  icon: string | null;
  accentColor: string | null;
  isSystem: boolean;
  sortOrder: number;
  /** Archived (hidden) types are not offered for new collections (O-025, O-041). */
  archivedAt: string | null;
};

export type Category = {
  id: string;
  key: string | null;
  name: string | null;
  icon: string | null;
  color: string | null;
  templateKey: TemplateKey;
  isSystem: boolean;
  sortOrder: number;
  /** Archived categories are not offered for new entries but stay on existing ones (O-025). */
  archivedAt: string | null;
};

/** An independent top-level container (FR-013, FR-014). */
export type Collection = {
  id: string;
  typeId: string;
  name: string;
  description: string | null;
  iconOverride: string | null;
  accentColorOverride: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

/** Field limits (O-027). Lengths count Unicode code points, not UTF-16 units. */
export const NAME_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 10_000;

const codePoints = (text: string) => [...text].length;

/** Trims a collection, type, or category name and checks it is non-empty and within 60. */
export function validateName(input: string): string {
  const name = input.trim();
  if (name.length === 0) throw new DomainError('name-required');
  if (codePoints(name) > NAME_MAX_LENGTH) throw new DomainError('name-too-long');
  return name;
}

/** Trims an optional description; blank becomes null. */
export function validateDescription(input: string | null | undefined): string | null {
  const description = input?.trim() ?? '';
  if (description.length === 0) return null;
  if (codePoints(description) > DESCRIPTION_MAX_LENGTH) {
    throw new DomainError('description-too-long');
  }
  return description;
}

const ICON_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Accepts an icon identifier (lowercase, hyphenated, as in Ionicons names) or null. Whether the
 * name is in the offered icon set is the picker's job (O-046).
 */
export function validateIcon(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (input.length > 64 || !ICON_NAME.test(input)) throw new DomainError('invalid-icon');
  return input;
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Accepts `#RRGGBB` (stored uppercase) or null, matching the schema CHECK. */
export function validateColor(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (!HEX_COLOR.test(input)) throw new DomainError('invalid-color');
  return input.toUpperCase();
}

/** Built-in collection types (FR-011, DATABASE_DESIGN §3.2). IDs are permanent (O-020). */
export const BUILT_IN_COLLECTION_TYPES = (
  [
    { key: 'PERSON', sequence: 1 },
    { key: 'SPACE', sequence: 2 },
    { key: 'PROJECT', sequence: 3 },
    { key: 'EVENT', sequence: 4 },
    { key: 'GENERAL', sequence: 5 },
  ] as const
).map(({ key, sequence }) => ({
  id: builtInId(BUILT_IN_TABLE.collectionTypes, sequence),
  key,
  sortOrder: sequence,
}));

/** Built-in categories and their templates (FR-020, DATABASE_DESIGN §3.4). IDs are permanent. */
export const BUILT_IN_CATEGORIES = (
  [
    { key: 'WISHLIST', templateKey: 'WISHLIST', sequence: 1 },
    { key: 'EXPERIENCES', templateKey: 'EVENT', sequence: 2 },
    { key: 'PREFERENCES', templateKey: 'PREFERENCE', sequence: 3 },
    { key: 'HOME_IMPROVEMENTS', templateKey: 'TASK', sequence: 4 },
    { key: 'TASKS_REPAIRS', templateKey: 'TASK', sequence: 5 },
    { key: 'IMPORTANT_DATES', templateKey: 'EVENT', sequence: 6 },
    { key: 'GENERAL_NOTES', templateKey: 'NOTE', sequence: 7 },
  ] as const
).map(({ key, templateKey, sequence }) => ({
  id: builtInId(BUILT_IN_TABLE.categories, sequence),
  key,
  templateKey: templateKey as TemplateKey,
  sortOrder: sequence,
}));

export type BuiltInCollectionTypeKey = (typeof BUILT_IN_COLLECTION_TYPES)[number]['key'];
export type BuiltInCategoryKey = (typeof BUILT_IN_CATEGORIES)[number]['key'];
