import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { Entry } from '@/domain/entries';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData } from '@/features/catalog/catalog-services';
import { ListRow } from '@/features/catalog/list-row';
import { useTranslation } from '@/localization/localization-provider';

import { entryBadges } from './entry-display';

/**
 * The Quick Capture Inbox (B-007, FR-031, FR-035): system-managed, so it cannot be renamed,
 * archived, or deleted. Entries leave it by being assigned from their entry screen.
 */
export function InboxScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const [showArchived, setShowArchived] = useState(false);
  const { data } = useCatalogData(async ({ entries }) => ({
    active: await entries.listInbox({ archived: false }),
    archived: await entries.listInbox({ archived: true }),
  }));

  if (!data) return <View style={[styles.fill, { backgroundColor: c.background }]} />;

  const row = (entry: Entry) => (
    <ListRow
      key={entry.id}
      icon="file-tray-outline"
      title={entry.title}
      badges={entryBadges(entry, t)}
      onPress={() => router.push(`/entry/${entry.id}`)}
    />
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      {data.active.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSecondary }]}>{t('inbox.empty')}</Text>
      ) : (
        <View style={styles.list}>{data.active.map(row)}</View>
      )}
      <Button
        label={showArchived ? t('entries.hideArchived') : t('entries.showArchived')}
        icon={showArchived ? 'chevron-up' : 'chevron-down'}
        onPress={() => setShowArchived((shown) => !shown)}
      />
      {showArchived &&
        (data.archived.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>{t('entries.noArchived')}</Text>
        ) : (
          <View style={styles.list}>{data.archived.map(row)}</View>
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
  list: {
    gap: spacing.sm,
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
