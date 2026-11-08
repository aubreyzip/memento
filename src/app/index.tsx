import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/design-system/use-theme-colors';
import { spacing } from '@/design-system/tokens';

/**
 * Placeholder start screen. Phase 1 replaces it with the navigation shell (ROADMAP Phase 1).
 * The literal strings are temporary until the English/Turkish resources are set up (O-034).
 */
export default function Index() {
  const c = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        Memento
      </Text>
      <Text style={[styles.tagline, { color: c.textSecondary }]}>Remember the little things.</Text>
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
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 16,
  },
});
