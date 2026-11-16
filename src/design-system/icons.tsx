import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

/** The one icon family (O-046): Ionicons. Filled/outline variants mark selection (O-042). */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export function isIconName(name: string | null | undefined): name is IconName {
  return typeof name === 'string' && Object.hasOwn(Ionicons.glyphMap, name);
}

/** A decorative icon: hidden from accessibility, since the text next to it carries the meaning. */
export function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color: ComponentProps<typeof Ionicons>['color'];
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Icons offered for collections, types, and categories. Outline style, in a stable order. */
export const ICON_CHOICES: readonly IconName[] = [
  'person-outline',
  'people-outline',
  'heart-outline',
  'home-outline',
  'bed-outline',
  'construct-outline',
  'hammer-outline',
  'briefcase-outline',
  'calendar-outline',
  'calendar-number-outline',
  'gift-outline',
  'sparkles-outline',
  'star-outline',
  'checkbox-outline',
  'document-text-outline',
  'book-outline',
  'folder-outline',
  'paw-outline',
  'car-outline',
  'airplane-outline',
  'restaurant-outline',
  'cafe-outline',
  'leaf-outline',
  'musical-notes-outline',
  'barbell-outline',
  'medkit-outline',
  'school-outline',
  'cart-outline',
];
