import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import type { Category, Collection } from '@/domain/catalog';
import type { Entry } from '@/domain/entries';
import { assignedTo } from '@/domain/entry-placement';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData, useCatalogServices } from '@/features/catalog/catalog-services';
import { errorMessage } from '@/features/catalog/error-message';
import { categoryName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

/**
 * Assigns an Inbox entry to a collection and category in one step (FR-032), or moves an
 * assigned entry to another one. The repository writes both together, so the entry is never
 * half-assigned (B-006); the status follows O-021.
 */
export function AssignEntryScreen({ id }: { id: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { data } = useCatalogData(async ({ entries, collections, categories }) => ({
    entry: await entries.get(id),
    collections: await collections.list({ archived: false }),
    categories: await categories.listAll(),
  }));

  const isInbox = data?.entry?.placement.kind !== 'assigned';
  const title = isInbox ? t('entries.assignTitle') : t('entries.moveTitle');
  return (
    <>
      <Stack.Screen options={{ title }} />
      {!data ? (
        <View style={[styles.fill, { backgroundColor: c.background }]} />
      ) : !data.entry ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('errors.not-found')}</Text>
      ) : data.collections.length === 0 ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>
          {t('entries.noCollections')}
        </Text>
      ) : (
        <AssignForm
          entry={data.entry}
          collections={data.collections}
          categories={data.categories}
        />
      )}
    </>
  );
}

function AssignForm({
  entry,
  collections,
  categories,
}: {
  entry: Entry;
  collections: Collection[];
  categories: Category[];
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { entries } = useCatalogServices();
  const current = entry.placement.kind === 'assigned' ? entry.placement : undefined;

  // Archived categories are not offered, except the one the entry already has (O-025).
  const offered = categories.filter((cat) => !cat.archivedAt || cat.id === current?.categoryId);
  const [collectionId, setCollectionId] = useState(
    current && collections.some((item) => item.id === current.collectionId)
      ? current.collectionId
      : collections[0].id,
  );
  const [categoryId, setCategoryId] = useState(current?.categoryId ?? offered[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await entries.update(entry.id, { placement: assignedTo(collectionId, categoryId) });
      router.back();
    } catch (caught) {
      setError(errorMessage(caught, t));
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <View style={styles.group}>
        <Text style={[styles.label, { color: c.textPrimary }]}>{t('entries.collection')}</Text>
        <OptionGroup
          accessibilityLabel={t('entries.collection')}
          options={collections.map((item) => ({ value: item.id, label: item.name }))}
          value={collectionId}
          onChange={setCollectionId}
        />
      </View>
      <View style={styles.group}>
        <Text style={[styles.label, { color: c.textPrimary }]}>{t('entries.form.category')}</Text>
        <OptionGroup
          accessibilityLabel={t('entries.form.category')}
          options={offered.map((cat) => ({ value: cat.id, label: categoryName(cat, t) }))}
          value={categoryId}
          onChange={setCategoryId}
        />
        {current ? (
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            {t('entries.statusResetHint')}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {error}
        </Text>
      ) : null}
      <Button variant="filled" label={t('common.save')} onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  group: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
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
});
