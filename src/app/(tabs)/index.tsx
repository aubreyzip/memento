import { StyleSheet, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';

/** Home. The dashboard is built in Phase 4. */
export default function HomeScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();

  return (
    <PlaceholderScreen>
      <Text style={[styles.tagline, { color: c.textSecondary }]}>{t('app.tagline')}</Text>
      <Text style={[styles.tagline, { color: c.textSecondary }]}>{t('common.comingSoon')}</Text>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
});
