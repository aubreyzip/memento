import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData } from '@/features/catalog/catalog-services';
import { useTranslation } from '@/localization/localization-provider';

/**
 * Home. The dashboard (pinned, upcoming, recent, pending) is built in Phase 4; until then it
 * shows the tagline and a way into the Inbox.
 */
export function HomeScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { data } = useCatalogData(async ({ entries }) => ({
    inboxCount: (await entries.listInbox({ archived: false })).length,
  }));

  return (
    <PlaceholderScreen>
      <Text style={[styles.tagline, { color: c.textSecondary }]}>{t('app.tagline')}</Text>
      <View style={styles.actions}>
        <Button
          icon="file-tray-outline"
          label={t('inbox.open', { count: data?.inboxCount ?? 0 })}
          onPress={() => router.push('/inbox')}
        />
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  actions: {
    marginTop: 16,
  },
});
