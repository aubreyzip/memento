import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';

/** Temporary content for areas that later phases fill in (ROADMAP Phase 1 navigation shell). */
export function PlaceholderScreen({ children }: { children?: ReactNode }) {
  const c = useThemeColors();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {children ?? (
        <Text style={[styles.text, { color: c.textSecondary }]}>{t('common.comingSoon')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});
