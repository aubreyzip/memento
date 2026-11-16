import { DomainError } from '@/domain/errors';
import type { Translate } from '@/localization/i18n';

/** User-facing text for a failed action. Never shows raw error text, which may hold user data. */
export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof DomainError) return t(`errors.${error.code}`, error.values);
  return t('errors.unknown');
}
