import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData, useCatalogServices } from '@/features/catalog/catalog-services';
import { errorMessage } from '@/features/catalog/error-message';
import { useTranslation } from '@/localization/localization-provider';

import { usePhoto } from './photo-section';

/** One photo at full size, decrypted in memory, with Delete (FR-050). No sharing (O-012). */
export function PhotoViewerScreen({ id }: { id: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { photos } = useCatalogServices();
  const { data } = useCatalogData(async ({ photos }) => ({ attachment: await photos.get(id) }));
  const attachment = data?.attachment;
  const uri = usePhoto(attachment, 'original');
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = () =>
    Alert.alert(t('photos.deleteTitle'), t('photos.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await photos.remove(id);
            router.back();
          } catch (caught) {
            setError(errorMessage(caught, t));
          }
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('photos.viewerTitle') }} />
      {!data ? null : !attachment ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('errors.not-found')}</Text>
      ) : uri === undefined ? (
        <ActivityIndicator color={c.primary} />
      ) : uri === null ? (
        <Text style={[styles.message, { color: c.textSecondary }]}>{t('photos.unavailable')}</Text>
      ) : (
        <Image
          source={{ uri }}
          accessibilityIgnoresInvertColors
          accessibilityLabel={t('photos.viewerTitle')}
          resizeMode="contain"
          style={[styles.image, { aspectRatio: attachment.width / attachment.height }]}
        />
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {error}
        </Text>
      ) : null}
      {attachment ? (
        <View style={styles.actions}>
          <Button icon="trash-outline" label={t('photos.delete')} onPress={confirmDelete} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  image: {
    width: '100%',
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
    gap: spacing.sm,
  },
});
