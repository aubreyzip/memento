import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { toIsoDate } from '@/domain/dates';
import { INBOX } from '@/domain/entry-placement';
import { templateRule } from '@/domain/entry-templates';
import { Icon } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { categoryIcon } from '@/features/catalog/catalog-display';
import { useCatalogData, useCatalogServices } from '@/features/catalog/catalog-services';
import { errorMessage } from '@/features/catalog/error-message';
import { categoryName } from '@/localization/catalog-names';
import { useTranslation } from '@/localization/localization-provider';

import { entryDetailLines, statusLabel } from './entry-display';

/**
 * One entry: its details and actions (FR-040 to FR-047). The status can be changed in place
 * when the template has statuses (O-021). Stored values are shown even when the current
 * template would not offer them (O-022).
 */
export function EntryDetailScreen({ id }: { id: string }) {
  const c = useThemeColors();
  const { t, language } = useTranslation();
  const { entries } = useCatalogServices();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, reload } = useCatalogData(async ({ entries, categories, collections }) => {
    const entry = await entries.get(id);
    const assigned = entry?.placement.kind === 'assigned' ? entry.placement : undefined;
    return {
      entry,
      links: entry ? await entries.links(entry.id) : [],
      tags: entry ? await entries.tags(entry.id) : [],
      category: assigned && (await categories.get(assigned.categoryId)),
      collection: assigned && (await collections.get(assigned.collectionId)),
    };
  });

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;
  const { entry, category, collection, links, tags } = data;
  if (!entry) {
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
  const change = (action: () => Promise<unknown>) =>
    run(async () => {
      await action();
      reload();
    });

  const isInbox = entry.placement.kind === 'inbox';

  // FR-033: back to the Inbox; the status is cleared (O-021), so ask first.
  const confirmMoveToInbox = () =>
    Alert.alert(
      t('entries.moveToInboxTitle'),
      t('entries.moveToInboxBody', { title: entry.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('entries.moveToInbox'),
          onPress: () => change(() => entries.update(entry.id, { placement: INBOX })),
        },
      ],
    );

  const confirmDelete = () =>
    Alert.alert(t('entries.delete.title'), t('entries.delete.body', { title: entry.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await entries.delete(entry.id);
            router.back();
          }),
      },
    ]);

  const statuses = templateRule(category?.templateKey ?? null).statuses;
  const place = [collection?.name, category ? categoryName(category, t) : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: entry.title }} />
      <View style={styles.header}>
        <Icon
          name={category ? categoryIcon(category) : 'file-tray-outline'}
          size={32}
          color={c.primary}
        />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            {entry.title}
          </Text>
          <Text style={[styles.place, { color: c.textSecondary }]}>
            {place || t('entries.inbox')}
          </Text>
        </View>
      </View>

      {entry.archivedAt ? (
        <Text style={[styles.notice, { color: c.textPrimary, borderColor: c.primary }]}>
          {t('entries.detail.archivedNotice')}
        </Text>
      ) : null}
      {entry.isPinned ? (
        <Text style={[styles.badge, { color: c.primary, borderColor: c.primary }]}>
          {t('entries.pinned')}
        </Text>
      ) : null}

      {entry.status && statuses.length > 0 ? (
        <OptionGroup
          accessibilityLabel={t('entries.form.status')}
          options={statuses.map((status) => ({ value: status, label: statusLabel(status, t) }))}
          value={entry.status}
          onChange={(status) => change(() => entries.update(entry.id, { status }))}
        />
      ) : null}
      {entryDetailLines(
        entry,
        category?.templateKey ?? null,
        t,
        language,
        toIsoDate(new Date()),
      ).map((line) => (
        <Text key={line} style={[styles.field, { color: c.textPrimary }]}>
          {line}
        </Text>
      ))}
      {entry.description ? (
        <Text style={[styles.description, { color: c.textPrimary }]}>{entry.description}</Text>
      ) : null}
      {links.length > 0 ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
            {t('entries.detail.links')}
          </Text>
          {links.map((link) => (
            <Text
              key={link.id}
              accessibilityRole="link"
              onPress={() => run(() => Linking.openURL(link.url))}
              style={[styles.link, { color: c.primary }]}>
              {link.title ?? link.url}
            </Text>
          ))}
        </View>
      ) : null}
      {tags.length > 0 ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
            {t('entries.detail.tags')}
          </Text>
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Text
                key={tag.id}
                style={[styles.badge, { color: c.primary, borderColor: c.primary }]}>
                {tag.name}
              </Text>
            ))}
          </View>
        </View>
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
          onPress={() => router.push(`/entry/${entry.id}/edit`)}
        />
        <Button
          icon={isInbox ? 'folder-open-outline' : 'swap-horizontal-outline'}
          label={isInbox ? t('entries.assign') : t('entries.move')}
          onPress={() => router.push(`/entry/${entry.id}/assign`)}
        />
        {isInbox ? null : (
          <Button
            icon="file-tray-outline"
            label={t('entries.moveToInbox')}
            onPress={confirmMoveToInbox}
          />
        )}
        <Button
          icon={entry.isPinned ? 'pin' : 'pin-outline'}
          label={entry.isPinned ? t('entries.unpin') : t('entries.pin')}
          onPress={() => change(() => entries.setPinned(entry.id, !entry.isPinned))}
        />
        <Button
          icon={entry.archivedAt ? 'arrow-undo-outline' : 'archive-outline'}
          label={entry.archivedAt ? t('common.restore') : t('common.archive')}
          onPress={() => change(() => entries.setArchived(entry.id, !entry.archivedAt))}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  place: {
    fontSize: 15,
  },
  notice: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  field: {
    fontSize: 16,
  },
  section: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
    paddingVertical: spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
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
