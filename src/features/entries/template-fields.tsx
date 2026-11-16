import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionGroup } from '@/components/option-group';
import { TextField } from '@/components/text-field';
import type { TemplateKey } from '@/domain/catalog';
import { localDate, toIsoDate, toLocalTime } from '@/domain/dates';
import {
  PRIORITIES,
  RECURRENCES,
  templateRule,
  TEMPLATE_FIELDS,
  type TemplateField,
} from '@/domain/entry-templates';
import { LIMITS } from '@/domain/limits';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';
import { pickDateTime } from '@/services/pickers/pick-date-time';

import { priorityLabel, statusLabel } from './entry-display';
import { dateLabelKey, formatDate, formatLocalTime } from './entry-format';
import type { TemplateValues } from './entry-form-values';

export type { TemplateValues } from './entry-form-values';

type EditorProps = {
  template: TemplateKey | null;
  values: TemplateValues;
  onChange: (patch: Partial<TemplateValues>) => void;
};

/** Whether a field holds a value, so it stays visible and clearable on any template (O-022). */
const HAS_VALUE: Record<TemplateField, (values: TemplateValues) => boolean> = {
  status: () => false, // status is remapped, never kept outside its template (O-021)
  priority: (v) => v.priority !== null,
  date: (v) => v.dateStart !== null,
  dateRange: (v) => v.dateEnd !== null,
  time: (v) => v.startTime !== null,
  price: (v) => v.amount.trim() !== '',
  location: (v) => v.locationText.trim() !== '',
};

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
      {children}
    </View>
  );
}

/** A labeled button that opens a picker, plus a Clear button once a value is set. */
function PickerField({
  label,
  valueText,
  icon,
  onPick,
  onClear,
}: {
  label: string;
  valueText: string | null;
  icon: 'calendar-outline' | 'time-outline';
  onPick: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const shown = valueText ?? t('entries.form.notSet');
  return (
    <Labeled label={label}>
      <View style={styles.row}>
        <Button
          icon={icon}
          label={shown}
          accessibilityLabel={`${label}, ${shown}`}
          onPress={onPick}
        />
        {valueText ? (
          <Button
            icon="close"
            label={t('common.clear')}
            accessibilityLabel={t('entries.form.clear', { field: label })}
            onPress={onClear}
          />
        ) : null}
      </View>
    </Labeled>
  );
}

function StatusEditor({ template, values, onChange }: EditorProps) {
  const { t } = useTranslation();
  const { statuses } = templateRule(template);
  if (statuses.length === 0 || !values.status) return null;
  return (
    <Labeled label={t('entries.form.status')}>
      <OptionGroup
        accessibilityLabel={t('entries.form.status')}
        options={statuses.map((status) => ({ value: status, label: statusLabel(status, t) }))}
        value={values.status}
        onChange={(status) => onChange({ status })}
      />
    </Labeled>
  );
}

function PriorityEditor({ values, onChange }: EditorProps) {
  const { t } = useTranslation();
  const none = 'none' as const;
  return (
    <Labeled label={t('entries.form.priority')}>
      <OptionGroup
        accessibilityLabel={t('entries.form.priority')}
        options={[
          { value: none, label: t('entries.priority.none') },
          ...PRIORITIES.map((priority) => ({ value: priority, label: priorityLabel(priority, t) })),
        ]}
        value={values.priority ?? none}
        onChange={(next) => onChange({ priority: next === none ? null : next })}
      />
    </Labeled>
  );
}

/** The main all-day date and, for dates without a time, how it repeats (O-024). */
function DateEditor({ template, values, onChange }: EditorProps) {
  const { t, language } = useTranslation();
  const { dateStart, dateEnd } = values;
  const label = t(dateLabelKey(template));
  const pick = () =>
    pickDateTime('date', dateStart ? localDate(dateStart) : new Date(), (picked) => {
      const next = toIsoDate(picked);
      onChange({ dateStart: next, ...(dateEnd && dateEnd < next ? { dateEnd: null } : {}) });
    });
  const clear = () =>
    onChange({
      dateStart: null,
      dateEnd: null,
      startTime: null,
      endTime: null,
      recurrence: 'NONE',
    });
  return (
    <>
      <PickerField
        label={label}
        icon="calendar-outline"
        valueText={dateStart ? formatDate(dateStart, language) : null}
        onPick={pick}
        onClear={clear}
      />
      {dateStart && !values.startTime ? (
        <Labeled label={t('entries.form.repeat')}>
          <OptionGroup
            accessibilityLabel={t('entries.form.repeat')}
            options={RECURRENCES.map((r) => ({ value: r, label: t(`entries.recurrence.${r}`) }))}
            value={values.recurrence}
            onChange={(recurrence) => onChange({ recurrence })}
          />
        </Labeled>
      ) : null}
    </>
  );
}

function DateRangeEditor({ values, onChange }: EditorProps) {
  const { t, language } = useTranslation();
  const { dateStart, dateEnd } = values;
  if (!dateStart) return null;
  return (
    <PickerField
      label={t('entries.form.endDate')}
      icon="calendar-outline"
      valueText={dateEnd ? formatDate(dateEnd, language) : null}
      onPick={() =>
        pickDateTime('date', localDate(dateEnd ?? dateStart), (picked) =>
          onChange({ dateEnd: toIsoDate(picked) }),
        )
      }
      onClear={() => onChange({ dateEnd: null })}
    />
  );
}

/** Start and end times for dates that do not repeat (O-024: repeating dates are all-day). */
function TimeEditor({ values, onChange }: EditorProps) {
  const { t, language } = useTranslation();
  const { dateStart, startTime, endTime } = values;
  if (!dateStart || values.recurrence !== 'NONE') return null;
  const timeOf = (time: string | null) => {
    const base = new Date();
    if (time) base.setHours(Number(time.slice(0, 2)), Number(time.slice(3)), 0, 0);
    return base;
  };
  return (
    <>
      <PickerField
        label={t('entries.form.startTime')}
        icon="time-outline"
        valueText={startTime ? formatLocalTime(startTime, language) : null}
        onPick={() =>
          pickDateTime('time', timeOf(startTime), (picked) =>
            onChange({ startTime: toLocalTime(picked) }),
          )
        }
        onClear={() => onChange({ startTime: null, endTime: null })}
      />
      {startTime ? (
        <PickerField
          label={t('entries.form.endTime')}
          icon="time-outline"
          valueText={endTime ? formatLocalTime(endTime, language) : null}
          onPick={() =>
            pickDateTime('time', timeOf(endTime ?? startTime), (picked) =>
              onChange({ endTime: toLocalTime(picked) }),
            )
          }
          onClear={() => onChange({ endTime: null })}
        />
      ) : null}
    </>
  );
}

function PriceEditor({ values, onChange }: EditorProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.price}>
      <View style={styles.amount}>
        <TextField
          label={t('entries.form.amount')}
          value={values.amount}
          onChangeText={(amount) => onChange({ amount })}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.currency}>
        <TextField
          label={t('entries.form.currency')}
          value={values.currencyCode}
          onChangeText={(currencyCode) => onChange({ currencyCode: currencyCode.toUpperCase() })}
          autoCapitalize="characters"
          maxLength={3}
        />
      </View>
    </View>
  );
}

function LocationEditor({ values, onChange }: EditorProps) {
  const { t } = useTranslation();
  return (
    <TextField
      label={t('entries.form.location')}
      value={values.locationText}
      onChangeText={(locationText) => onChange({ locationText })}
      multiline
      maxLength={LIMITS.location}
    />
  );
}

/**
 * One editor per template field (O-056). Adding a field means adding it to `TEMPLATE_RULES`
 * and an editor here.
 */
const EDITORS: Record<TemplateField, (props: EditorProps) => ReactNode> = {
  status: StatusEditor,
  priority: PriorityEditor,
  date: DateEditor,
  dateRange: DateRangeEditor,
  time: TimeEditor,
  price: PriceEditor,
  location: LocationEditor,
};

/**
 * The template-dependent part of the entry form: the fields the template offers, plus any field
 * that already holds a value, so stored values stay visible and clearable (O-022).
 */
export function TemplateFields(props: EditorProps) {
  const offered = templateRule(props.template).fields;
  const shown = TEMPLATE_FIELDS.filter(
    (field) => offered.includes(field) || HAS_VALUE[field](props.values),
  );
  return (
    <>
      {shown.map((field) => {
        const Editor = EDITORS[field];
        return <Editor key={field} {...props} />;
      })}
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  price: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amount: {
    flex: 2,
  },
  currency: {
    flex: 1,
  },
});
