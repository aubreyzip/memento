import type {
  BuiltInCategoryKey,
  BuiltInCollectionTypeKey,
  Category,
  Collection,
  CollectionType,
} from '@/domain/catalog';
import { isIconName, type IconName } from '@/design-system/icons';

/** Default icons for built-ins until the user picks one (O-041). Presentation only. */
const TYPE_ICONS: Record<BuiltInCollectionTypeKey, IconName> = {
  PERSON: 'person-outline',
  SPACE: 'home-outline',
  PROJECT: 'construct-outline',
  EVENT: 'calendar-outline',
  GENERAL: 'folder-outline',
};

const CATEGORY_ICONS: Record<BuiltInCategoryKey, IconName> = {
  WISHLIST: 'gift-outline',
  EXPERIENCES: 'sparkles-outline',
  PREFERENCES: 'heart-outline',
  HOME_IMPROVEMENTS: 'hammer-outline',
  TASKS_REPAIRS: 'checkbox-outline',
  IMPORTANT_DATES: 'calendar-number-outline',
  GENERAL_NOTES: 'document-text-outline',
};

const FALLBACK_TYPE_ICON: IconName = 'folder-outline';
const FALLBACK_CATEGORY_ICON: IconName = 'pricetag-outline';

export function collectionTypeIcon(type: CollectionType | undefined): IconName {
  if (!type) return FALLBACK_TYPE_ICON;
  if (isIconName(type.icon)) return type.icon;
  return (type.key && TYPE_ICONS[type.key as BuiltInCollectionTypeKey]) || FALLBACK_TYPE_ICON;
}

export function categoryIcon(category: Category): IconName {
  if (isIconName(category.icon)) return category.icon;
  return (
    (category.key && CATEGORY_ICONS[category.key as BuiltInCategoryKey]) || FALLBACK_CATEGORY_ICON
  );
}

/** A collection's own icon, else its type's. */
export function collectionIcon(collection: Collection, type: CollectionType | undefined): IconName {
  return isIconName(collection.iconOverride) ? collection.iconOverride : collectionTypeIcon(type);
}

/** A collection's own accent, else its type's; null draws no swatch. */
export function collectionAccent(
  collection: Collection,
  type: CollectionType | undefined,
): string | null {
  return collection.accentColorOverride ?? type?.accentColor ?? null;
}
