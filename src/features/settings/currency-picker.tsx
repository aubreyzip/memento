import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { TextField } from '@/components/text-field';
import { validateCurrencyCode } from '@/domain/money';
import { COMMON_CURRENCIES, DEVICE_CURRENCY } from '@/domain/settings';
import { spacing } from '@/design-system/tokens';
import { errorMessage } from '@/features/catalog/error-message';
import { useTranslation } from '@/localization/localization-provider';

import { useDefaultCurrency } from './currency-setting';

const DEVICE = 'device';
const OTHER = 'other';

/**
 * Default currency for new prices (O-010): the device region, a common currency, or any other
 * ISO 4217 code. Existing prices keep their own currency.
 */
export function CurrencyPicker() {
  const { t } = useTranslation();
  const { preference, deviceCode, setPreference } = useDefaultCurrency();
  const isListed =
    preference === DEVICE_CURRENCY || (COMMON_CURRENCIES as readonly string[]).includes(preference);
  const [showOther, setShowOther] = useState(!isListed);
  const [draft, setDraft] = useState(isListed ? '' : preference);
  const [error, setError] = useState<string | null>(null);

  const selected = showOther ? OTHER : preference === DEVICE_CURRENCY ? DEVICE : preference;
  const save = (next: string) => {
    // On a save failure the controller restores the previous value.
    setPreference(next).catch(() => {});
  };

  return (
    <View style={styles.group}>
      <OptionGroup
        accessibilityLabel={t('settings.currency.label')}
        options={[
          {
            value: DEVICE,
            label: deviceCode
              ? t('settings.currency.device', { code: deviceCode })
              : t('settings.currency.deviceNone'),
          },
          ...COMMON_CURRENCIES.map((code) => ({ value: code, label: code })),
          { value: OTHER, label: t('settings.currency.other') },
        ]}
        value={selected}
        onChange={(next) => {
          setError(null);
          if (next === OTHER) {
            setShowOther(true);
            return;
          }
          setShowOther(false);
          save(next === DEVICE ? DEVICE_CURRENCY : next);
        }}
      />
      {showOther ? (
        <View style={styles.other}>
          <View style={styles.input}>
            <TextField
              label={t('settings.currency.code')}
              value={draft}
              onChangeText={(text) => setDraft(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={3}
              error={error}
            />
          </View>
          <Button
            label={t('common.save')}
            accessibilityLabel={t('settings.currency.saveCode')}
            onPress={() => {
              try {
                save(validateCurrencyCode(draft));
                setError(null);
              } catch (caught) {
                setError(errorMessage(caught, t));
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  other: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
  },
});
