import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { TextField } from '@/components/text-field';
import type { Category } from '@/domain/catalog';
import { resolveStatus, type Entry } from '@/domain/entries';
import { assignedTo } from '@/domain/entry-placement';
import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData, useCatalogServices } from '@/features/catalog/catalog-services';
import { errorMessage } from '@/features/catalog/error-message';
import { useDefaultCurrency } from '@/features/settings/currency-setting';
import { categoryName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { decimalSeparator } from './entry-format';
import { initialTemplateValues, toEntryFields } from './entry-form-values';
import { LinksEditor, TagsEditor } from './links-tags-fields';
import { TemplateFields, type TemplateValues } from './template-fields';

/**
 * Create an entry in a collection, or edit one when `id` is given (FR-040 to FR-047). The fields
 * after the category follow its template (O-022). Inbox entries keep their placement here;
 * assigning them is the Inbox flow's job.
 */
export function EntryFormScreen({ id, collectionId }: { id?: string; collectionId?: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { data } = useCatalogData(async ({ entries, categories }) => ({
    entry: id ? await entries.get(id) : undefined,
    links: id ? (await entries.links(id)).map((link) => link.url) : [],
    tags: id ? (await entries.tags(id)).map((tag) => tag.name) : [],
    categories: await categories.listAll(),
  }));

  const title = id ? t('entries.form.editTitle') : t('entries.form.newTitle');
  const missing = data && (id ? !data.entry : !collectionId);
  return (
    <>
      <Stack.Screen options={{ title }} />
      {!data ? (
        <View style={[styles.fill, { backgroundColor: c.background }]} />
      ) : missing ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('errors.not-found')}</Text>
      ) : (
        <EntryForm
          entry={data.entry}
          initialLinks={data.links}
          initialTags={data.tags}
          collectionId={collectionId}
          categories={data.categories}
        />
      )}
    </>
  );
}

function EntryForm({
  entry,
  initialLinks,
  initialTags,
  collectionId,
  categories,
}: {
  entry: Entry | undefined;
  initialLinks: string[];
  initialTags: string[];
  collectionId: string | undefined;
  categories: Category[];
}) {
  const c = useThemeColors();
  const { t, language } = useTranslation();
  const { entries } = useCatalogServices();
  const { effective: defaultCurrency } = useDefaultCurrency();

  const isInbox = entry?.placement.kind === 'inbox';
  const originalCategoryId =
    entry?.placement.kind === 'assigned' ? entry.placement.categoryId : null;
  // Archived categories are not offered, except the one this entry already has (O-025).
  const offered = categories.filter((cat) => !cat.archivedAt || cat.id === originalCategoryId);
  const templateOf = (categoryId: string | null) =>
    categories.find((cat) => cat.id === categoryId)?.templateKey ?? null;

  const [categoryId, setCategoryId] = useState(originalCategoryId ?? offered[0]?.id ?? '');
  const template = isInbox ? null : templateOf(categoryId);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [values, setValues] = useState<TemplateValues>(() =>
    initialTemplateValues(entry, template, {
      defaultCurrency,
      decimalSeparator: decimalSeparator(language),
    }),
  );
  const [links, setLinks] = useState(initialLinks);
  const [tags, setTags] = useState(initialTags);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // O-021: another template gets its default status; back to the original restores the status.
  const changeCategory = (next: string) => {
    const nextTemplate = templateOf(next);
    setCategoryId(next);
    if (nextTemplate === template) return;
    setValues((current) => ({
      ...current,
      status:
        entry && nextTemplate === templateOf(originalCategoryId)
          ? entry.status
          : resolveStatus(nextTemplate, undefined),
    }));
  };

  const save = async () => {
    setSaving(true);
    setTitleError(null);
    setFormError(null);
    const placement =
      entry?.placement.kind === 'inbox'
        ? entry.placement
        : assignedTo(
            entry?.placement.kind === 'assigned' ? entry.placement.collectionId : collectionId!,
            categoryId,
          );
    try {
      const input = { ...toEntryFields(values), placement, title, description, links, tags };
      const saved = entry ? await entries.update(entry.id, input) : await entries.create(input);
      if (entry) router.back();
      else router.replace(`/entry/${saved.id}`);
    } catch (error) {
      const message = errorMessage(error, t);
      if (error instanceof DomainError && error.code.startsWith('title-')) setTitleError(message);
      else setFormError(message);
      setSaving(false);
    }
  };

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
      {isInbox ? null : (
        <View style={styles.group}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('entries.form.category')}</Text>
          <OptionGroup
            accessibilityLabel={t('entries.form.category')}
            options={offered.map((cat) => ({ value: cat.id, label: categoryName(cat, t) }))}
            value={categoryId}
            onChange={changeCategory}
          />
        </View>
      )}
      <TemplateFields
        template={template}
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      />
      <LinksEditor links={links} onChange={setLinks} />
      <TagsEditor tags={tags} onChange={setTags} />
      {formError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {formError}
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
