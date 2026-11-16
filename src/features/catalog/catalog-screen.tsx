import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { categoryName, collectionTypeName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { categoryIcon, collectionTypeIcon } from './catalog-display';
import { useCatalogData, useCatalogServices } from './catalog-services';
import { errorMessage } from './error-message';
import { ListRow } from './list-row';

export type CatalogKind = 'type' | 'category';

export function isCatalogKind(value: unknown): value is CatalogKind {
  return value === 'type' || value === 'category';
}

type Item = {
  id: string;
  title: string;
  icon: IconName;
  accent: string | null;
  badges: string[];
};

/** Collection types and categories: open, add, and reorder (FR-012, FR-021, FR-027). */
export function CatalogScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const services = useCatalogServices();
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useCatalogData(async ({ collectionTypes, categories }) => ({
    types: await collectionTypes.listAll(),
    categories: await categories.listAll(),
  }));

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;

  const badges = (isSystem: boolean, archivedAt: string | null, extra?: string) =>
    [
      extra,
      isSystem ? t('common.builtIn') : undefined,
      archivedAt ? t('common.archived') : undefined,
    ].filter((badge): badge is string => Boolean(badge));

  const typeItems: Item[] = data.types.map((type) => ({
    id: type.id,
    title: collectionTypeName(type, t),
    icon: collectionTypeIcon(type),
    accent: type.accentColor,
    badges: badges(type.isSystem, type.archivedAt),
  }));
  const categoryItems: Item[] = data.categories.map((category) => ({
    id: category.id,
    title: categoryName(category, t),
    icon: categoryIcon(category),
    accent: category.color,
    badges: badges(
      category.isSystem,
      category.archivedAt,
      t(`catalog.templates.${category.templateKey}`),
    ),
  }));

  const move = async (kind: CatalogKind, items: Item[], index: number, offset: -1 | 1) => {
    const ids = items.map((item) => item.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    setError(null);
    try {
      await (kind === 'type' ? services.collectionTypes : services.categories).reorder(ids);
    } catch (e) {
      setError(errorMessage(e, t));
    }
    reload();
  };

  const section = (kind: CatalogKind, heading: string, addLabel: string, items: Item[]) => (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
        {heading}
      </Text>
      {items.map((item, index) => (
        <ListRow
          key={item.id}
          icon={item.icon}
          title={item.title}
          badges={item.badges}
          accent={item.accent}
          onPress={() => router.push(`/catalog/${kind}/${item.id}`)}
          trailing={
            <View style={styles.moves}>
              <MoveButton
                icon="chevron-up"
                label={t('common.moveUp', { name: item.title })}
                disabled={index === 0}
                onPress={() => move(kind, items, index, -1)}
              />
              <MoveButton
                icon="chevron-down"
                label={t('common.moveDown', { name: item.title })}
                disabled={index === items.length - 1}
                onPress={() => move(kind, items, index, 1)}
              />
            </View>
          }
        />
      ))}
      <Button icon="add" label={addLabel} onPress={() => router.push(`/catalog/${kind}/new`)} />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {error}
        </Text>
      ) : null}
      {section('type', t('catalog.typesHeading'), t('catalog.newType'), typeItems)}
      {section('category', t('catalog.categoriesHeading'), t('catalog.newCategory'), categoryItems)}
    </ScrollView>
  );
}

function MoveButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.move, disabled && styles.disabled]}>
      <Icon name={icon} color={c.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
  },
  moves: {
    flexDirection: 'row',
  },
  move: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
});
