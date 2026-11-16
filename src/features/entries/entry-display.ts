import type { Entry } from '@/domain/entries';
import type { EntryStatus, Priority } from '@/domain/entry-templates';
import type { Translate } from '@/localization/i18n';

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
