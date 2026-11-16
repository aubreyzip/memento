import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from '@/design-system/icons';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { QuickAddButton } from '@/features/capture/quick-add-button';
import type { TranslationKey } from '@/localization/i18n';
import { useTranslation } from '@/localization/localization-provider';

const TABS: {
  name: string;
  label: TranslationKey;
  icon: { selected: IconName; unselected: IconName };
  title?: string;
}[] = [
  // The Home header shows the product name, which is not translated.
  {
    name: 'index',
    label: 'nav.home',
    icon: { selected: 'home', unselected: 'home-outline' },
    title: 'Memento',
  },
  {
    name: 'collections',
    label: 'nav.collections',
    icon: { selected: 'albums', unselected: 'albums-outline' },
  },
  {
    name: 'search',
    label: 'nav.search',
    icon: { selected: 'search', unselected: 'search-outline' },
  },
  {
    name: 'settings',
    label: 'nav.settings',
    icon: { selected: 'settings', unselected: 'settings-outline' },
  },
];

/**
 * The four primary areas (B-008). The selected tab is shown by a filled icon (O-046), bold
 * underlined label, and color, so color is never the only cue (O-042).
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
        tabBarStyle: { backgroundColor: c.surface },
      }}>
      {TABS.map(({ name, label, icon, title }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: title ?? t(label),
            tabBarAccessibilityLabel: t(label),
            tabBarIcon: ({ focused, size }) => (
              <Icon
                name={focused ? icon.selected : icon.unselected}
                color={focused ? c.primary : c.textSecondary}
                size={size}
              />
            ),
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
  label: {
    fontSize: 14,
  },
  labelFocused: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
