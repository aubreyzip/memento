import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DatabaseStartResult } from '@/database/bootstrap/open-encrypted-database';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import type { TranslationKey } from '@/localization/i18n';
import { useTranslation } from '@/localization/localization-provider';

/*
 * These screens render before the database is open, so they use the System appearance and the
 * System language with English fallback (O-044): they run outside the settings providers.
 */

type ErrorReason = Extract<DatabaseStartResult, { status: 'error' }>['reason'];

function ScreenFrame({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return <View style={[styles.frame, { backgroundColor: c.background }]}>{children}</View>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { backgroundColor: c.primary }]}>
      <Text style={[styles.buttonLabel, { color: c.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function StartupLoadingScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  return (
    <ScreenFrame>
      <ActivityIndicator accessibilityLabel={t('startup.loading')} color={c.primary} />
    </ScreenFrame>
  );
}

/** O-019 recovery screen. The unreadable database has already been quarantined, not deleted. */
export function RecoveryScreen({ onStartFresh }: { onStartFresh: () => void }) {
  const c = useThemeColors();
  const { t } = useTranslation();

  const confirmStartFresh = () =>
    Alert.alert(t('startup.recovery.confirmTitle'), t('startup.recovery.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('startup.recovery.startFresh'), onPress: onStartFresh },
    ]);

  return (
    <ScreenFrame>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        {t('startup.recovery.title')}
      </Text>
      <Text style={[styles.body, { color: c.textPrimary }]}>{t('startup.recovery.body')}</Text>
      {/* Restore (UC-15) is built in Phase 5; until then only "Start fresh" is offered. */}
      <Text style={[styles.body, { color: c.textSecondary }]}>
        {t('startup.recovery.restoreNote')}
      </Text>
      <PrimaryButton label={t('startup.recovery.startFresh')} onPress={confirmStartFresh} />
    </ScreenFrame>
  );
}

/** Startup failures where nothing was created or changed; the user can only retry or update. */
export function StartupErrorScreen({
  reason,
  onRetry,
}: {
  reason: ErrorReason;
  onRetry: () => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const message: TranslationKey = `startup.error.${reason}`;

  return (
    <ScreenFrame>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        {t('startup.error.title')}
      </Text>
      <Text style={[styles.body, { color: c.textPrimary }]}>{t(message)}</Text>
      <PrimaryButton label={t('startup.error.retry')} onPress={onRetry} />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    minHeight: 48,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
