import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';

import {
  allPassed,
  runDeviceChecks,
  type DeviceCheckEnv,
  type DeviceCheckResult,
} from './run-device-checks';

/** Prefix for log lines, so results can be collected with `adb logcat` (synthetic data only). */
export const LOG_PREFIX = 'MEMENTO_DEVICE_CHECK';

/**
 * Developer-only screen for the on-device checks (O-017). Rendered instead of the app only in
 * development builds started with EXPO_PUBLIC_DEVICE_CHECKS=1; never in release builds.
 * Its text is not localized because it is a developer tool, not product UI.
 */
export function DeviceChecksScreen({ createEnv }: { createEnv: () => DeviceCheckEnv }) {
  const c = useThemeColors();
  const [results, setResults] = useState<DeviceCheckResult[] | null>(null);

  useEffect(() => {
    let current = true;
    runDeviceChecks(createEnv()).then((r) => {
      for (const result of r) console.log(`${LOG_PREFIX} ${JSON.stringify(result)}`);
      console.log(`${LOG_PREFIX} ${JSON.stringify({ summary: allPassed(r) ? 'PASS' : 'FAIL' })}`);
      if (current) setResults(r);
    });
    return () => {
      current = false;
    };
  }, [createEnv]);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        Device checks
      </Text>
      {results === null ? (
        <ActivityIndicator accessibilityLabel="Running checks" color={c.primary} />
      ) : (
        <>
          <Text style={[styles.summary, { color: c.textPrimary }]}>
            {allPassed(results) ? 'All checks passed' : 'Some checks failed'}
          </Text>
          {results.map((r) => (
            <View key={r.id} style={styles.row}>
              {/* State is shown in words, not color alone (O-042). */}
              <Text style={[styles.status, { color: c.textPrimary }]}>
                {r.ok ? 'PASS' : 'FAIL'}
              </Text>
              <Text style={[styles.detail, { color: c.textSecondary }]}>
                {r.gate} {r.id}: {r.detail}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '700' },
  summary: { fontSize: 17, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  status: { fontWeight: '700', width: 44 },
  detail: { flex: 1 },
});
