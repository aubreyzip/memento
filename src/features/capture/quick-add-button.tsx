import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';

/**
 * Global Quick Add entry point (B-008): shown in the header of every primary area and opens the
 * capture modal. Quick Capture itself is built in Phase 3.
 */
export function QuickAddButton() {
  const c = useThemeColors();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('quickAdd.label')}
      hitSlop={spacing.sm}
      onPress={() => router.push('/capture')}
      style={[styles.button, { backgroundColor: c.primary }]}>
      <Text style={[styles.plus, { color: c.onPrimary }]} importantForAccessibility="no">
        +
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  plus: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
});
