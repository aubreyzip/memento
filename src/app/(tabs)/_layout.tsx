import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useThemeColors } from '@/design-system/use-theme-colors';
import { QuickAddButton } from '@/features/capture/quick-add-button';
import type { TranslationKey } from '@/localization/i18n';
import { useTranslation } from '@/localization/localization-provider';

const TABS: { name: string; label: TranslationKey; title?: string }[] = [
  // The Home header shows the product name, which is not translated.
  { name: 'index', label: 'nav.home', title: 'Memento' },
  { name: 'collections', label: 'nav.collections' },
  { name: 'search', label: 'nav.search' },
  { name: 'settings', label: 'nav.settings' },
];

/**
 * The four primary areas (B-008). Tabs are text-only until an icon set is chosen (O-046).
 * The selected tab is shown by weight and underline as well as color (O-042).
 */
export default function TabsLayout() {
  const c = useThemeColors();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <QuickAddButton />,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarIconStyle: styles.noIcon,
        tabBarStyle: { backgroundColor: c.surface },
      }}>
      {TABS.map(({ name, label, title }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: title ?? t(label),
            tabBarAccessibilityLabel: t(label),
            tabBarLabel: ({ focused, color }) => (
              <Text style={[styles.label, { color }, focused && styles.labelFocused]}>
                {t(label)}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  noIcon: {
    display: 'none',
  },
  label: {
    fontSize: 14,
  },
  labelFocused: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
