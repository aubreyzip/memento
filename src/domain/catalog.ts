import { BUILT_IN_TABLE, builtInId } from './ids';

/** Category templates (B-005). They decide applicable fields and status behavior. */
export const TEMPLATE_KEYS = ['NOTE', 'TASK', 'WISHLIST', 'EVENT', 'PREFERENCE'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type CollectionType = {
  id: string;
  /** Stable key for built-in types; null for custom types. */
  key: string | null;
  /** User-entered name for custom types; null for built-ins (localized via translation keys). */
  name: string | null;
  isSystem: boolean;
  sortOrder: number;
};

export type Category = {
  id: string;
  key: string | null;
  name: string | null;
  templateKey: TemplateKey;
  isSystem: boolean;
  sortOrder: number;
};

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
