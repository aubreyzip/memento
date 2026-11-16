import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';

import { AppearancePicker } from './appearance-picker';
import { CurrencyPicker } from './currency-picker';
import { LanguagePicker } from './language-picker';

/** Settings area: appearance, language, default currency; later phases add their own sections. */
export function SettingsScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
          {t('settings.appearance.label')}
        </Text>
        <AppearancePicker />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
          {t('settings.language.label')}
        </Text>
        <LanguagePicker />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
          {t('settings.currency.label')}
        </Text>
        <Text style={{ color: c.textSecondary }}>{t('settings.currency.hint')}</Text>
        <CurrencyPicker />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
  },
});
