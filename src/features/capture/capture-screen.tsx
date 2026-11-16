import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { TextField } from '@/components/text-field';
import type { Category, Collection } from '@/domain/catalog';
import { assignedTo, INBOX } from '@/domain/entry-placement';
import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData, useCatalogServices } from '@/features/catalog/catalog-services';
import { errorMessage } from '@/features/catalog/error-message';
import { categoryName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

/** The Inbox choice in the destination group; collections use their IDs. */
const INBOX_CHOICE = 'inbox';

/**
 * Quick Capture (UC-05, FR-030): a title, an optional description, and optionally a collection
 * and category. Without a choice the entry goes to the Inbox, unsorted (B-007).
 */
export function CaptureScreen() {
  const c = useThemeColors();
  const { data } = useCatalogData(async ({ collections, categories }) => ({
    collections: await collections.list({ archived: false }),
    categories: (await categories.listAll()).filter((category) => !category.archivedAt),
  }));

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;
  return <CaptureForm collections={data.collections} categories={data.categories} />;
}

function CaptureForm({
  collections,
  categories,
}: {
  collections: Collection[];
  categories: Category[];
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { entries } = useCatalogServices();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState(INBOX_CHOICE);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSaved(null);
  };

  const save = async () => {
    setSaving(true);
    setTitleError(null);
    setFormError(null);
    try {
      const placement = destination === INBOX_CHOICE ? INBOX : assignedTo(destination, categoryId);
      await entries.create({ placement, title, description });
      const collection = collections.find((item) => item.id === destination);
      setSaved(
        collection
          ? t('capture.savedCollection', { name: collection.name })
          : t('capture.savedInbox'),
      );
    } catch (error) {
      const message = errorMessage(error, t);
      if (error instanceof DomainError && error.code.startsWith('title-')) setTitleError(message);
      else setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={[styles.fill, styles.confirmation, { backgroundColor: c.background }]}>
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.confirmationText, { color: c.textPrimary }]}>
          {saved}
        </Text>
        <View style={styles.actions}>
          <Button icon="add" label={t('capture.another')} onPress={reset} />
          <Button variant="filled" label={t('capture.done')} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <TextField
        label={t('entries.form.title')}
        value={title}
        onChangeText={setTitle}
        error={titleError}
        maxLength={LIMITS.title}
      />
      <TextField
        label={t('entries.form.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={LIMITS.description}
      />
      {collections.length > 0 ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('capture.destination')}</Text>
          <OptionGroup
            accessibilityLabel={t('capture.destination')}
            options={[
              { value: INBOX_CHOICE, label: t('inbox.title') },
              ...collections.map((collection) => ({
                value: collection.id,
                label: collection.name,
              })),
            ]}
            value={destination}
            onChange={setDestination}
          />
        </View>
      ) : null}
      {destination !== INBOX_CHOICE ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('capture.category')}</Text>
          <OptionGroup
            accessibilityLabel={t('capture.category')}
            options={categories.map((category) => ({
              value: category.id,
              label: categoryName(category, t),
            }))}
            value={categoryId}
            onChange={setCategoryId}
          />
        </View>
      ) : null}
      {formError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {formError}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button variant="filled" label={t('common.save')} onPress={save} disabled={saving} />
        <Button label={t('common.cancel')} onPress={() => router.back()} />
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
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmation: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  confirmationText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
