import { OptionGroup } from '@/components/option-group';
import { LANGUAGE_PREFERENCES } from '@/domain/settings';
import { LANGUAGE_NAMES } from '@/localization/i18n';
import { useTranslation } from '@/localization/localization-provider';

/** System / English / Türkçe selector (FR-003, O-034). Changes apply immediately. */
export function LanguagePicker() {
  const { preference, setPreference, t } = useTranslation();

  return (
    <OptionGroup
      accessibilityLabel={t('settings.language.label')}
      options={LANGUAGE_PREFERENCES.map((value) => ({
        value,
        label: value === 'system' ? t('settings.language.system') : LANGUAGE_NAMES[value],
      }))}
      value={preference}
      onChange={(next) => {
        // On a save failure the controller restores the previous value.
        setPreference(next).catch(() => {});
      }}
    />
  );
}
