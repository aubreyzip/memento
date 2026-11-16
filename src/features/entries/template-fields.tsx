import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OptionGroup } from '@/components/option-group';
import type { TemplateKey } from '@/domain/catalog';
import {
  PRIORITIES,
  templateRule,
  TEMPLATE_FIELDS,
  type EntryStatus,
  type Priority,
  type TemplateField,
} from '@/domain/entry-templates';
import { spacing } from '@/design-system/tokens';
import { useThemeColors } from '@/design-system/use-theme-colors';
import { useTranslation } from '@/localization/localization-provider';

import { priorityLabel, statusLabel } from './entry-display';

/** The template-dependent values the entry form edits. Grows as field editors are added. */
export type TemplateValues = {
  status: EntryStatus | null;
  priority: Priority | null;
};

type EditorProps = {
  template: TemplateKey | null;
  values: TemplateValues;
  onChange: (patch: Partial<TemplateValues>) => void;
};

/** Whether a field currently holds a value, so it stays visible on any template (O-022). */
const HAS_VALUE: Partial<Record<TemplateField, (values: TemplateValues) => boolean>> = {
  priority: (values) => values.priority !== null,
};

function Labeled({ label, children }: { label: string; children: ReactElement }) {
  const c = useThemeColors();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
      {children}
    </View>
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

/**
 * One editor per template field (O-056). A field with no editor yet is skipped, so adding a
 * field to a template in `TEMPLATE_RULES` and an editor here is all a new field needs.
 */
const EDITORS: Partial<Record<TemplateField, (props: EditorProps) => ReactElement | null>> = {
  status: StatusEditor,
  priority: PriorityEditor,
};

/**
 * The template-dependent part of the entry form: the fields the template offers, plus any field
 * that already holds a value, so stored values stay visible and clearable (O-022).
 */
export function TemplateFields(props: EditorProps) {
  const offered = templateRule(props.template).fields;
  const shown = TEMPLATE_FIELDS.filter(
    (field) => offered.includes(field) || HAS_VALUE[field]?.(props.values),
  );
  return (
    <>
      {shown.map((field) => {
        const Editor = EDITORS[field];
        return Editor ? <Editor key={field} {...props} /> : null;
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
});
