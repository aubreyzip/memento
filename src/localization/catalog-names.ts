import type {
  BuiltInCategoryKey,
  BuiltInCollectionTypeKey,
  Category,
  CollectionType,
} from '@/domain/catalog';

import type { Translate, TranslationKey } from './i18n';

/**
 * Display names. Built-ins are localized from translation resources; custom names are user data
 * shown exactly as entered, in every language (DATABASE_DESIGN §5, FR-006).
 */
export function collectionTypeName(type: CollectionType, t: Translate): string {
  if (type.isSystem && type.key) {
    const key: TranslationKey = `builtIns.collectionTypes.${type.key as BuiltInCollectionTypeKey}`;
    return t(key);
  }
  return type.name ?? '';
}

export function categoryName(category: Category, t: Translate): string {
  if (category.isSystem && category.key) {
    const key: TranslationKey = `builtIns.categories.${category.key as BuiltInCategoryKey}`;
    return t(key);
  }
  return category.name ?? '';
}
