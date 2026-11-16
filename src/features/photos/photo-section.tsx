import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { Attachment } from '@/domain/attachments';
import { LIMITS } from '@/domain/limits';
import { Icon } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useCatalogData, useCatalogServices } from '@/features/catalog/catalog-services';
import { errorMessage } from '@/features/catalog/error-message';
import { useTranslation } from '@/localization/localization-provider';

const THUMBNAIL_SIZE = 96;
const MEGABYTE = 1024 * 1024;

/** A decrypted photo as a `data:` URI; `null` when it cannot be opened, `undefined` while loading. */
export function usePhoto(attachment: Attachment | undefined, variant: 'original' | 'thumbnail') {
  const { photos } = useCatalogServices();
  const key = attachment ? `${attachment.id}:${variant}` : null;
  const [loaded, setLoaded] = useState<{ key: string; uri: string | null } | null>(null);
  useEffect(() => {
    let current = true;
    if (attachment && key) {
      photos.load(attachment, variant).then((uri) => current && setLoaded({ key, uri }));
    }
    return () => {
      current = false;
    };
  }, [attachment, key, photos, variant]);
  // A result for another photo (before the new one loads) counts as still loading.
  return loaded && loaded.key === key ? loaded.uri : undefined;
}

function Thumbnail({ attachment, label }: { attachment: Attachment; label: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const uri = usePhoto(attachment, 'thumbnail');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={uri === null ? `${label}, ${t('photos.unavailable')}` : label}
      onPress={() => router.push(`/photo/${attachment.id}`)}
      style={[styles.thumbnail, { backgroundColor: c.surface, borderColor: c.border }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumbnailImage} accessibilityIgnoresInvertColors />
      ) : (
        <Icon
          name={uri === null ? 'alert-circle-outline' : 'image-outline'}
          color={c.textSecondary}
        />
      )}
    </Pressable>
  );
}

/**
 * Photos of an entry (FR-049, FR-050): encrypted thumbnails, the picker for the remaining room
 * (O-027: up to 10), and messages for photos that were skipped.
 */
export function PhotoSection({ entryId }: { entryId: string }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { photos } = useCatalogServices();
  const { data, reload } = useCatalogData(({ photos }) => photos.list(entryId));
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const add = async () => {
    setBusy(true);
    setMessages([]);
    try {
      const result = await photos.addFromLibrary(entryId);
      const next: string[] = [];
      if (result.tooLarge > 0) {
        next.push(
          t('photos.tooLarge', { max: LIMITS.imageIntakeBytes / MEGABYTE, count: result.tooLarge }),
        );
      }
      if (result.failed > 0) next.push(t('photos.failed', { count: result.failed }));
      setMessages(next);
    } catch (error) {
      setMessages([errorMessage(error, t)]);
    } finally {
      setBusy(false);
      reload();
    }
  };

  const list = data ?? [];
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
        {t('photos.heading', { count: list.length, max: LIMITS.photosPerEntry })}
      </Text>
      {list.length > 0 ? (
        <View style={styles.grid}>
          {list.map((attachment, index) => (
            <Thumbnail
              key={attachment.id}
              attachment={attachment}
              label={t('photos.photo', { index: index + 1, count: list.length })}
            />
          ))}
        </View>
      ) : null}
      {messages.map((message) => (
        <Text
          key={message}
          accessibilityLiveRegion="polite"
          style={[styles.message, { color: c.primary }]}>
          {message}
        </Text>
      ))}
      <Button
        icon="images-outline"
        label={t('photos.add')}
        onPress={add}
        disabled={busy || !data || list.length >= LIMITS.photosPerEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
  },
});
