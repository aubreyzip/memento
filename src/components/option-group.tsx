import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';

export type Option<T extends string> = { value: T; label: string };

/**
 * Single-choice option group (radio semantics). The selected option is a filled `primary` pill
 * and the others are outlined, plus the accessibility "selected" state, so the state is never
 * conveyed by color alone (O-042). Touch targets are at least 48 dp.
 */
export function OptionGroup<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const c = useThemeColors();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              { borderColor: c.primary },
              selected && { backgroundColor: c.primary },
            ]}>
            <Text
              style={[
                styles.label,
                { color: selected ? c.onPrimary : c.primary },
                selected && styles.labelSelected,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  option: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
  },
  labelSelected: {
    fontWeight: '600',
  },
});
