import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { Entry } from '@/domain/entries';
import { Icon } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { entryBadges } from '@/features/entries/entry-display';
import { categoryName, collectionTypeName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { categoryIcon, collectionAccent, collectionIcon } from './catalog-display';
import { useCatalogData, useCatalogServices } from './catalog-services';
import { errorMessage } from './error-message';
import { ListRow } from './list-row';

/** One collection: its details, actions, and entries (FR-010, FR-016, FR-040). */
export function CollectionDetailScreen({ id }: { id: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { collections } = useCatalogServices();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { data, reload } = useCatalogData(
    async ({ collections, collectionTypes, entries, categories }) => {
      const collection = await collections.get(id);
      return {
        collection,
        type: collection && (await collectionTypes.get(collection.typeId)),
        entries: await entries.listInCollection(id, { archived: false }),
        archivedEntries: await entries.listInCollection(id, { archived: true }),
        categories: new Map((await categories.listAll()).map((cat) => [cat.id, cat])),
      };
    },
  );

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;
  const { collection, type, categories } = data;
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

  const entryRow = (entry: Entry) => {
    const category =
      entry.placement.kind === 'assigned' ? categories.get(entry.placement.categoryId) : undefined;
    return (
      <ListRow
        key={entry.id}
        icon={category ? categoryIcon(category) : 'document-text-outline'}
        title={entry.title}
        subtitle={category ? categoryName(category, t) : undefined}
        badges={entryBadges(entry, t)}
        onPress={() => router.push(`/entry/${entry.id}`)}
      />
    );
  };

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

      <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
        {t('entries.heading')}
      </Text>
      {collection.archivedAt ? null : (
        <Button
          variant="filled"
          icon="add"
          label={t('entries.new')}
          onPress={() =>
            router.push({ pathname: '/entry/new', params: { collectionId: collection.id } })
          }
        />
      )}
      {data.entries.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSecondary }]}>{t('entries.empty')}</Text>
      ) : (
        <View style={styles.list}>{data.entries.map(entryRow)}</View>
      )}
      <Button
        label={showArchived ? t('entries.hideArchived') : t('entries.showArchived')}
        icon={showArchived ? 'chevron-up' : 'chevron-down'}
        onPress={() => setShowArchived((shown) => !shown)}
      />
      {showArchived &&
        (data.archivedEntries.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>{t('entries.noArchived')}</Text>
        ) : (
          <View style={styles.list}>{data.archivedEntries.map(entryRow)}</View>
        ))}
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
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  list: {
    gap: spacing.sm,
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
