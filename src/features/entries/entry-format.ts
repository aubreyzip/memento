import type { TemplateKey } from '@/domain/catalog';
import { localDate } from '@/domain/dates';
import { currencyDigits } from '@/domain/money';
import type { SupportedLanguage } from '@/domain/settings';
import type { TranslationKey } from '@/localization/i18n';

/** Display formatting in the UI language. Values are stored language-independently. */

export const formatDate = (date: string, language: SupportedLanguage) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(localDate(date));

/** A UTC instant as a local time of day. */
export const formatTime = (instant: string, language: SupportedLanguage) =>
  new Intl.DateTimeFormat(language, { timeStyle: 'short' }).format(new Date(instant));

/** A local `HH:MM` time on an arbitrary day, for form buttons. */
export function formatLocalTime(time: string, language: SupportedLanguage) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(language, { timeStyle: 'short' }).format(
    new Date(2000, 0, 1, hours, minutes),
  );
}

export function formatPrice(minor: number, currencyCode: string, language: SupportedLanguage) {
  const amount = minor / 10 ** currencyDigits(currencyCode);
  try {
    return new Intl.NumberFormat(language, { style: 'currency', currency: currencyCode }).format(
      amount,
    );
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

/** The decimal separator of the UI language ("." in English, "," in Turkish). */
export function decimalSeparator(language: SupportedLanguage): string {
  return (
    new Intl.NumberFormat(language).formatToParts(1.5).find((part) => part.type === 'decimal')
      ?.value ?? '.'
  );
}

/** What the main date means for each template (O-022 matrix: due, target, or event date). */
const DATE_LABELS: Partial<Record<TemplateKey, TranslationKey>> = {
  TASK: 'entries.form.dueDate',
  WISHLIST: 'entries.form.targetDate',
};

export const dateLabelKey = (template: TemplateKey | null): TranslationKey =>
  (template && DATE_LABELS[template]) || 'entries.form.date';
