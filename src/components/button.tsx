import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from '@/design-system/icons';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';

/**
 * Text button, at least 48 dp tall. `filled` is the main action on a screen; `outline` the
 * others. Both use `primary` (O-042); destructive actions are marked by their label and a
 * confirmation, not by color.
 */
export function Button({
  label,
  onPress,
  variant = 'outline',
  icon,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline';
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useThemeColors();
  const filled = variant === 'filled';
  const foreground = filled ? c.onPrimary : c.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: c.primary },
        filled && { backgroundColor: c.primary },
        (pressed || disabled) && styles.dimmed,
      ]}>
      {icon && <Icon name={icon} size={20} color={foreground} />}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
