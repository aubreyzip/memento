import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { Collection, CollectionType } from '@/domain/catalog';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { collectionTypeName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { collectionAccent, collectionIcon } from './catalog-display';
import { useCatalogData } from './catalog-services';
import { ListRow } from './list-row';

/** The Collections area (FR-010): active collections, archived ones on request. */
export function CollectionsScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const [showArchived, setShowArchived] = useState(false);
  const { data } = useCatalogData(async ({ collections, collectionTypes }) => ({
    active: await collections.list({ archived: false }),
    archived: await collections.list({ archived: true }),
    types: new Map((await collectionTypes.listAll()).map((type) => [type.id, type])),
  }));

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;

  const row = (collection: Collection, type: CollectionType | undefined) => (
    <ListRow
      key={collection.id}
      icon={collectionIcon(collection, type)}
      title={collection.name}
      subtitle={type ? collectionTypeName(type, t) : undefined}
      accent={collectionAccent(collection, type)}
      onPress={() => router.push(`/collection/${collection.id}`)}
    />
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <Button
          variant="filled"
          icon="add"
          label={t('collections.new')}
          onPress={() => router.push('/collection/new')}
        />
        <Button
          icon="options-outline"
          label={t('collections.manageCatalog')}
          onPress={() => router.push('/catalog')}
        />
      </View>

      {data.active.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSecondary }]}>{t('collections.empty')}</Text>
      ) : (
        <View style={styles.list}>
          {data.active.map((collection) => row(collection, data.types.get(collection.typeId)))}
        </View>
      )}

      <Button
        label={showArchived ? t('collections.hideArchived') : t('collections.showArchived')}
        icon={showArchived ? 'chevron-up' : 'chevron-down'}
        onPress={() => setShowArchived((shown) => !shown)}
      />
      {showArchived && (
        <View style={styles.list}>
          <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
            {t('collections.archivedHeading')}
          </Text>
          {data.archived.length === 0 ? (
            <Text style={{ color: c.textSecondary }}>{t('collections.noArchived')}</Text>
          ) : (
            data.archived.map((collection) => row(collection, data.types.get(collection.typeId)))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  empty: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
  },
});
