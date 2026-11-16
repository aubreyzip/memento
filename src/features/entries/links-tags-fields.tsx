import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { foldForSearch } from '@/domain/search';
import { LIMITS } from '@/domain/limits';
import { splitTagInput, validateLinks, validateTagNames } from '@/domain/links-tags';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { errorMessage } from '@/features/catalog/error-message';
import { useTranslation } from '@/localization/localization-provider';

/**
 * Links and tags apply to every template and to Inbox entries (O-022, O-023), so the form shows
 * them regardless of the category. Values are checked when added, with the same rules the
 * repository applies on save.
 */

function AddRow({
  label,
  buttonLabel,
  onAdd,
  disabled,
  autoCapitalize,
}: {
  label: string;
  buttonLabel: string;
  onAdd: (text: string) => void;
  disabled?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    try {
      onAdd(draft);
      setDraft('');
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, t));
    }
  };
  return (
    <View style={styles.addRow}>
      <View style={styles.addInput}>
        <TextField
          label={label}
          value={draft}
          onChangeText={setDraft}
          error={error}
          autoCapitalize={autoCapitalize}
        />
      </View>
      <Button
        icon="add"
        label={t('entries.form.add')}
        accessibilityLabel={buttonLabel}
        onPress={add}
        disabled={disabled || draft.trim() === ''}
      />
    </View>
  );
}

export function LinksEditor({
  links,
  onChange,
}: {
  links: readonly string[];
  onChange: (links: string[]) => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{t('entries.form.links')}</Text>
      {links.map((url) => (
        <View key={url} style={styles.item}>
          <Text style={[styles.itemText, { color: c.textPrimary }]} numberOfLines={2}>
            {url}
          </Text>
          <Button
            icon="close"
            label={t('common.remove')}
            accessibilityLabel={t('entries.form.removeLink', { url })}
            onPress={() => onChange(links.filter((link) => link !== url))}
          />
        </View>
      ))}
      <AddRow
        label={t('entries.form.newLink')}
        buttonLabel={t('entries.form.addLink')}
        autoCapitalize="none"
        disabled={links.length >= LIMITS.linksPerEntry}
        onAdd={(text) => onChange(validateLinks([...links, text]))}
      />
    </View>
  );
}

export function TagsEditor({
  tags,
  onChange,
}: {
  tags: readonly string[];
  onChange: (tags: string[]) => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{t('entries.form.tags')}</Text>
      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((name) => (
            <Button
              key={foldForSearch(name)}
              icon="close"
              label={name}
              accessibilityLabel={t('entries.form.removeTag', { name })}
              onPress={() => onChange(tags.filter((tag) => tag !== name))}
            />
          ))}
        </View>
      ) : null}
      <AddRow
        label={t('entries.form.newTags')}
        buttonLabel={t('entries.form.addTags')}
        autoCapitalize="sentences"
        onAdd={(text) => onChange(validateTagNames([...tags, ...splitTagInput(text)]))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  addInput: {
    flex: 1,
  },
});
