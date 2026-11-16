import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { TextField } from '@/components/text-field';
import { DESCRIPTION_MAX_LENGTH, type Collection, type CollectionType } from '@/domain/catalog';
import { DomainError } from '@/domain/errors';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { collectionTypeName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { AccentPicker, IconPicker } from './appearance-pickers';
import { collectionTypeIcon } from './catalog-display';
import { useCatalogData, useCatalogServices } from './catalog-services';
import { errorMessage } from './error-message';

/** Create a collection, or edit one when `id` is given (FR-010, FR-013). */
export function CollectionFormScreen({ id }: { id?: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { data } = useCatalogData(async ({ collections, collectionTypes }) => ({
    collection: id ? await collections.get(id) : undefined,
    types: await collectionTypes.listAll(),
  }));

  const title = id ? t('collections.form.editTitle') : t('collections.form.newTitle');
  return (
    <>
      <Stack.Screen options={{ title }} />
      {!data ? (
        <View style={[styles.fill, { backgroundColor: c.background }]} />
      ) : id && !data.collection ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('errors.not-found')}</Text>
      ) : (
        <CollectionForm collection={data.collection} types={data.types} />
      )}
    </>
  );
}

function CollectionForm({
  collection,
  types,
}: {
  collection: Collection | undefined;
  types: CollectionType[];
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { collections } = useCatalogServices();

  // Archived types are not offered, except the one this collection already has (O-025).
  const offered = types.filter((type) => !type.archivedAt || type.id === collection?.typeId);
  const [name, setName] = useState(collection?.name ?? '');
  const [typeId, setTypeId] = useState(collection?.typeId ?? offered[0]?.id ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [icon, setIcon] = useState<string | null>(collection?.iconOverride ?? null);
  const [accent, setAccent] = useState<string | null>(collection?.accentColorOverride ?? null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setNameError(null);
    setFormError(null);
    const input = {
      typeId,
      name,
      description,
      iconOverride: icon,
      accentColorOverride: accent,
    };
    try {
      const saved = collection
        ? await collections.update(collection.id, input)
        : await collections.create(input);
      if (collection) router.back();
      else router.replace(`/collection/${saved.id}`);
    } catch (error) {
      const message = errorMessage(error, t);
      const isNameError = error instanceof DomainError && error.code.startsWith('name-');
      if (isNameError) setNameError(message);
      else setFormError(message);
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <TextField
        label={t('collections.form.name')}
        value={name}
        onChangeText={setName}
        error={nameError}
      />
      <View style={styles.group}>
        <Text style={[styles.label, { color: c.textPrimary }]}>{t('collections.form.type')}</Text>
        <OptionGroup
          accessibilityLabel={t('collections.form.type')}
          options={offered.map((type) => ({ value: type.id, label: collectionTypeName(type, t) }))}
          value={typeId}
          onChange={setTypeId}
        />
      </View>
      <TextField
        label={t('collections.form.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={DESCRIPTION_MAX_LENGTH}
      />
      <IconPicker
        value={icon}
        defaultIcon={collectionTypeIcon(types.find((type) => type.id === typeId))}
        onChange={setIcon}
      />
      <AccentPicker value={accent} onChange={setAccent} />
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
