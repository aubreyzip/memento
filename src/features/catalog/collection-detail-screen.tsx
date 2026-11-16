import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { collectionTypeName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { collectionAccent, collectionIcon } from './catalog-display';
import { useCatalogData, useCatalogServices } from './catalog-services';
import { errorMessage } from './error-message';

/**
 * One collection: its details and actions (FR-010, FR-016). Entries are listed here once the
 * entry slice lands.
 */
export function CollectionDetailScreen({ id }: { id: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { collections } = useCatalogServices();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, reload } = useCatalogData(async ({ collections, collectionTypes }) => {
    const collection = await collections.get(id);
    return {
      collection,
      type: collection && (await collectionTypes.get(collection.typeId)),
    };
  });

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;
  const { collection, type } = data;
  if (!collection) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('errors.not-found')}</Text>
      </View>
    );
  }

  const run = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(errorMessage(error, t));
    }
  };

  const toggleArchived = () =>
    run(async () => {
      await collections.setArchived(collection.id, !collection.archivedAt);
      reload();
    });

  const confirmDelete = () =>
    run(async () => {
      const count = await collections.entryCount(collection.id);
      Alert.alert(
        t('collections.delete.title'),
        t('collections.delete.body', { name: collection.name, count }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () =>
              run(async () => {
                await collections.delete(collection.id);
                router.back();
              }),
          },
        ],
      );
    });

  const accent = collectionAccent(collection, type);
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: collection.name }} />
      <View style={styles.header}>
        <Icon name={collectionIcon(collection, type)} size={32} color={c.primary} />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.name, { color: c.textPrimary }]}>
            {collection.name}
          </Text>
          {type ? (
            <Text style={[styles.type, { color: c.textSecondary }]}>
              {collectionTypeName(type, t)}
            </Text>
          ) : null}
        </View>
        {accent ? (
          <View style={[styles.swatch, { backgroundColor: accent, borderColor: c.border }]} />
        ) : null}
      </View>

      {collection.archivedAt ? (
        <Text style={[styles.notice, { color: c.textPrimary, borderColor: c.primary }]}>
          {t('collections.detail.archivedNotice')}
        </Text>
      ) : null}
      {collection.description ? (
        <Text style={[styles.description, { color: c.textPrimary }]}>{collection.description}</Text>
      ) : null}

      <Text style={[styles.placeholder, { color: c.textSecondary }]}>
        {t('collections.detail.entriesPlaceholder')}
      </Text>

      {actionError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {actionError}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          icon="create-outline"
          label={t('common.edit')}
          onPress={() => router.push(`/collection/${collection.id}/edit`)}
        />
        <Button
          icon={collection.archivedAt ? 'arrow-undo-outline' : 'archive-outline'}
          label={collection.archivedAt ? t('common.restore') : t('common.archive')}
          onPress={toggleArchived}
        />
        <Button icon="trash-outline" label={t('common.delete')} onPress={confirmDelete} />
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  type: {
    fontSize: 15,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  notice: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  placeholder: {
    fontSize: 15,
    fontStyle: 'italic',
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
  message: {
    padding: spacing.lg,
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
