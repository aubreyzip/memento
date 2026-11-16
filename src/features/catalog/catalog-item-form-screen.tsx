import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { TextField } from '@/components/text-field';
import {
  TEMPLATE_KEYS,
  type Category,
  type CollectionType,
  type TemplateKey,
} from '@/domain/catalog';
import { DomainError } from '@/domain/errors';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { categoryName, collectionTypeName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { AccentPicker, IconPicker } from './appearance-pickers';
import { categoryIcon, collectionTypeIcon } from './catalog-display';
import type { CatalogKind } from './catalog-screen';
import { useCatalogData, useCatalogServices } from './catalog-services';
import { errorMessage } from './error-message';

type Item = { kind: 'type'; value: CollectionType } | { kind: 'category'; value: Category };

/**
 * Create or edit a collection type or category (FR-012, FR-021, FR-025, FR-027, O-041).
 * Built-ins keep their name; their icon and color can change, and they can be archived.
 */
export function CatalogItemFormScreen({ kind, id }: { kind: CatalogKind; id?: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { data } = useCatalogData(async ({ collectionTypes, categories }) => {
    if (!id) return { item: undefined };
    const item: Item | undefined =
      kind === 'type'
        ? await collectionTypes.get(id).then((value) => value && { kind, value })
        : await categories.get(id).then((value) => value && { kind, value });
    return { item };
  });

  const title =
    kind === 'type'
      ? t(id ? 'catalog.form.editType' : 'catalog.form.newType')
      : t(id ? 'catalog.form.editCategory' : 'catalog.form.newCategory');

  return (
    <>
      <Stack.Screen options={{ title }} />
      {!data ? (
        <View style={[styles.fill, { backgroundColor: c.background }]} />
      ) : id && !data.item ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('errors.not-found')}</Text>
      ) : (
        <CatalogItemForm kind={kind} item={data.item} />
      )}
    </>
  );
}

function CatalogItemForm({ kind, item }: { kind: CatalogKind; item: Item | undefined }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { collectionTypes, categories } = useCatalogServices();

  const current = item?.value;
  const isSystem = current?.isSystem ?? false;
  const displayName = item
    ? item.kind === 'type'
      ? collectionTypeName(item.value, t)
      : categoryName(item.value, t)
    : '';
  const [name, setName] = useState(current?.name ?? '');
  const [templateKey, setTemplateKey] = useState<TemplateKey>(
    item?.kind === 'category' ? item.value.templateKey : 'NOTE',
  );
  const [icon, setIcon] = useState<string | null>(current?.icon ?? null);
  const [accent, setAccent] = useState<string | null>(
    item?.kind === 'type'
      ? item.value.accentColor
      : item?.kind === 'category'
        ? item.value.color
        : null,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setNameError(null);
    setFormError(null);
    try {
      await action();
    } catch (error) {
      const message = errorMessage(error, t);
      if (error instanceof DomainError && error.code.startsWith('name-')) setNameError(message);
      else setFormError(message);
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      // Built-in names are never sent, so they cannot change (O-041).
      const named = isSystem ? {} : { name };
      if (kind === 'type') {
        const changes = { ...named, icon, accentColor: accent };
        if (current) await collectionTypes.update(current.id, changes);
        else await collectionTypes.create({ name, icon, accentColor: accent });
      } else {
        const changes = { ...named, icon, color: accent };
        if (current) await categories.update(current.id, changes);
        else await categories.create({ name, templateKey, icon, color: accent });
      }
      router.back();
    });

  const repository = kind === 'type' ? collectionTypes : categories;

  const toggleArchived = () =>
    run(async () => {
      if (!current) return;
      await repository.setArchived(current.id, !current.archivedAt);
      router.back();
    });

  const confirmDelete = () => {
    if (!current) return;
    Alert.alert(
      kind === 'type' ? t('catalog.delete.typeTitle') : t('catalog.delete.categoryTitle'),
      t('catalog.delete.body', { name: displayName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await repository.delete(current.id);
              router.back();
            }),
        },
      ],
    );
  };

  const defaultIcon = item
    ? item.kind === 'type'
      ? collectionTypeIcon({ ...item.value, icon: null })
      : categoryIcon({ ...item.value, icon: null })
    : kind === 'type'
      ? collectionTypeIcon(undefined)
      : 'pricetag-outline';

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      {isSystem ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('catalog.form.name')}</Text>
          <Text style={[styles.value, { color: c.textPrimary }]}>{displayName}</Text>
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            {t('catalog.form.builtInName')}
          </Text>
        </View>
      ) : (
        <TextField
          label={t('catalog.form.name')}
          value={name}
          onChangeText={setName}
          error={nameError}
        />
      )}

      {kind === 'category' && (
        <View style={styles.group}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('catalog.form.template')}</Text>
          {current ? (
            <>
              <Text style={[styles.value, { color: c.textPrimary }]}>
                {t(`catalog.templates.${templateKey}`)}
              </Text>
              <Text style={[styles.hint, { color: c.textSecondary }]}>
                {t('catalog.form.templateFixed')}
              </Text>
            </>
          ) : (
            <OptionGroup
              accessibilityLabel={t('catalog.form.template')}
              options={TEMPLATE_KEYS.map((key) => ({
                value: key,
                label: t(`catalog.templates.${key}`),
              }))}
              value={templateKey}
              onChange={setTemplateKey}
            />
          )}
        </View>
      )}

      <IconPicker value={icon} defaultIcon={defaultIcon} onChange={setIcon} />
      <AccentPicker value={accent} onChange={setAccent} />

      {formError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {formError}
        </Text>
      ) : null}
      <Button variant="filled" label={t('common.save')} onPress={save} disabled={busy} />

      {current && (
        <View style={styles.group}>
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            {kind === 'type'
              ? t('catalog.form.typeArchivedHint')
              : t('catalog.form.categoryArchivedHint')}
          </Text>
          <View style={styles.actions}>
            <Button
              icon={current.archivedAt ? 'arrow-undo-outline' : 'archive-outline'}
              label={current.archivedAt ? t('common.restore') : t('common.archive')}
              onPress={toggleArchived}
              disabled={busy}
            />
            {!isSystem && (
              <Button
                icon="trash-outline"
                label={t('common.delete')}
                onPress={confirmDelete}
                disabled={busy}
              />
            )}
          </View>
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
  value: {
    fontSize: 17,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
