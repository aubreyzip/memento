import type { TemplateKey } from '@/domain/catalog';
import { nextOccurrence } from '@/domain/dates';
import type { Entry } from '@/domain/entries';
import type { EntryStatus, Priority } from '@/domain/entry-templates';
import type { SupportedLanguage } from '@/domain/settings';
import type { Translate } from '@/localization/i18n';

import { dateLabelKey, formatDate, formatPrice, formatTime } from './entry-format';

export const statusLabel = (status: EntryStatus, t: Translate) => t(`entries.status.${status}`);

export const priorityLabel = (priority: Priority, t: Translate) =>
  t(`entries.priority.${priority}`);

/** Short state badges for a list row: pinned, status, priority (text, never color alone). */
export function entryBadges(entry: Entry, t: Translate): string[] {
  return [
    entry.isPinned ? t('entries.pinned') : null,
    entry.status ? statusLabel(entry.status, t) : null,
    entry.priority ? priorityLabel(entry.priority, t) : null,
  ].filter((badge): badge is string => badge !== null);
}

/**
 * The entry's stored field values as readable lines, whatever its template, so values kept
 * after a template change stay visible (O-022). `today` is the device's `YYYY-MM-DD`.
 */
export function entryDetailLines(
  entry: Entry,
  template: TemplateKey | null,
  t: Translate,
  language: SupportedLanguage,
  today: string,
): string[] {
  const lines: string[] = [];
  if (entry.priority) {
    lines.push(t('entries.detail.priority', { value: priorityLabel(entry.priority, t) }));
  }
  if (entry.dateStart) {
    let value = formatDate(entry.dateStart, language);
    if (entry.dateEnd && entry.dateEnd !== entry.dateStart) {
      value += ` – ${formatDate(entry.dateEnd, language)}`;
    }
    if (entry.startsAtUtc) {
      value += `, ${formatTime(entry.startsAtUtc, language)}`;
      if (entry.endsAtUtc) value += ` – ${formatTime(entry.endsAtUtc, language)}`;
    }
    lines.push(t('entries.detail.field', { label: t(dateLabelKey(template)), value }));
  }
  if (entry.dateStart && entry.recurrence !== 'NONE') {
    lines.push(t('entries.detail.repeats', { value: t(`entries.recurrence.${entry.recurrence}`) }));
    const next = nextOccurrence(entry.dateStart, entry.recurrence, today);
    if (next) lines.push(t('entries.detail.next', { date: formatDate(next, language) }));
  }
  if (entry.priceMinor !== null && entry.currencyCode) {
    lines.push(
      t('entries.detail.price', {
        value: formatPrice(entry.priceMinor, entry.currencyCode, language),
      }),
    );
  }
  if (entry.locationText) {
    lines.push(t('entries.detail.location', { value: entry.locationText }));
  }
  return lines;
}
