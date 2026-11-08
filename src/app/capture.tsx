import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';

/** Quick Capture modal. The capture form and Inbox are built in Phase 3. */
export default function CaptureScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();

  return (
    <PlaceholderScreen>
      <Text style={[styles.text, { color: c.textSecondary }]}>{t('common.comingSoon')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[styles.button, { borderColor: c.primary }]}>
        <Text style={[styles.buttonLabel, { color: c.primary }]}>{t('common.close')}</Text>
      </Pressable>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
