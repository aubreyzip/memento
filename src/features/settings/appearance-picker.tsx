import { OptionGroup } from '@/components/option-group';
import { useAppearance } from '@/design-system/appearance-provider';
import { APPEARANCE_PREFERENCES } from '@/domain/settings';
import { useTranslation } from '@/localization/localization-provider';

/** System / Light / Dark selector (FR-004). */
export function AppearancePicker() {
  const { preference, setPreference } = useAppearance();
  const { t } = useTranslation();

  return (
    <OptionGroup
      accessibilityLabel={t('settings.appearance.label')}
      options={APPEARANCE_PREFERENCES.map((value) => ({
        value,
        label: t(`settings.appearance.${value}`),
      }))}
      value={preference}
      onChange={(next) => {
        // On a save failure the controller restores the previous value.
        setPreference(next).catch(() => {});
      }}
    />
  );
}
