import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';

/** Labeled text input with an optional error message shown as text (not color alone, O-042). */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  multiline = false,
  maxLength,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  const c = useThemeColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? undefined}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={c.textSecondary}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: c.textPrimary, borderColor: c.primary, backgroundColor: c.surface },
          error ? styles.inputError : null,
        ]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.primary }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderWidth: 2,
  },
  error: {
    fontSize: 14,
    fontWeight: '600',
  },
});
