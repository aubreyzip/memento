import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';

/**
 * One row in a collection, type, or category list: icon, title, optional subtitle and badges,
 * an optional decorative accent swatch, and trailing controls. Pressing the row opens it.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  badges = [],
  accent,
  onPress,
  trailing,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  badges?: string[];
  accent?: string | null;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const c = useThemeColors();
  const details = [subtitle, ...badges].filter(Boolean).join(', ');

  return (
    <View style={[styles.row, { backgroundColor: c.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={details ? `${title}, ${details}` : title}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <Icon name={icon} color={c.primary} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: c.textPrimary }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
          ) : null}
          {badges.length > 0 ? (
            <View style={styles.badges}>
              {badges.map((badge) => (
                <Text
                  key={badge}
                  style={[styles.badge, { color: c.primary, borderColor: c.primary }]}>
                  {badge}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        {accent ? (
          <View style={[styles.swatch, { backgroundColor: accent, borderColor: c.border }]} />
        ) : null}
      </Pressable>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingRight: spacing.xs,
  },
  main: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
});
