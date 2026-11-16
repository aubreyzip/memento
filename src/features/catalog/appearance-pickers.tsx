import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ICON_CHOICES, Icon, type IconName } from '@/design-system/icons';
import { palette, spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import type { TranslationKey } from '@/localization/i18n';
import { useTranslation } from '@/localization/localization-provider';

/** Readable name for an icon option, e.g. `calendar-number-outline` → "calendar number". */
const iconLabel = (name: IconName) => name.replace(/-outline$/, '').replace(/-/g, ' ');

/**
 * Icon choice (radio group). `null` means "default", shown with `defaultIcon`. The selected
 * option is filled and reports the selected state, so selection is not shown by color alone.
 */
export function IconPicker({
  value,
  defaultIcon,
  onChange,
}: {
  value: string | null;
  defaultIcon: IconName;
  onChange: (next: IconName | null) => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const options: { icon: IconName; value: IconName | null; label: string }[] = [
    { icon: defaultIcon, value: null, label: t('catalog.form.defaultIcon') },
    ...ICON_CHOICES.map((icon) => ({ icon, value: icon, label: iconLabel(icon) })),
  ];

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('catalog.form.icon')}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{t('catalog.form.icon')}</Text>
      <View style={styles.grid}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value ?? 'default'}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.cell,
                { borderColor: selected ? c.primary : c.border },
                selected && { backgroundColor: c.primary, borderWidth: 2 },
              ]}>
              <Icon name={option.icon} color={selected ? c.onPrimary : c.primary} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ACCENTS: { color: string; label: TranslationKey }[] = [
  { color: palette.burgundy, label: 'catalog.colors.burgundy' },
  { color: palette.coral, label: 'catalog.colors.coral' },
  { color: palette.softCoral, label: 'catalog.colors.softCoral' },
  { color: palette.peach, label: 'catalog.colors.peach' },
];

/** Accent choice from the palette (decorative, O-042); `null` means no accent. */
export function AccentPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const options: { color: string | null; label: string }[] = [
    { color: null, label: t('catalog.colors.none') },
    ...ACCENTS.map(({ color, label }) => ({ color, label: t(label) })),
  ];

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('catalog.form.color')}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{t('catalog.form.color')}</Text>
      <View style={styles.grid}>
        {options.map((option) => {
          const selected = option.color === (value?.toUpperCase() ?? null);
          return (
            <Pressable
              key={option.color ?? 'none'}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.color)}
              style={[styles.cell, { borderColor: c.primary }, selected && styles.selectedCell]}>
              {option.color ? (
                <View style={[styles.swatch, { backgroundColor: option.color }]} />
              ) : (
                <Icon name="close-outline" color={c.primary} />
              )}
              {selected && (
                <View style={[styles.check, { backgroundColor: c.primary }]}>
                  <Icon name="checkmark" size={14} color={c.onPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCell: {
    borderWidth: 3,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  check: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
