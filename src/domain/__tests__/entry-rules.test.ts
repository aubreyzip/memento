import { TEMPLATE_KEYS } from '../catalog';
import { completedAtFor, resolveStatus, validatePriority, validateTitle } from '../entries';
import { ENTRY_STATUSES, offersField, TEMPLATE_FIELDS, TEMPLATE_RULES } from '../entry-templates';
import { LIMITS } from '../limits';
import { foldForSearch } from '../search';

const NOW = '2026-11-16T10:00:00.000Z';
const EARLIER = '2026-11-01T10:00:00.000Z';

describe('template rules table (O-021, O-022, O-056)', () => {
  it.each(TEMPLATE_KEYS)('%s is internally consistent', (key) => {
    const rule = TEMPLATE_RULES[key];
    expect(rule.fields.every((field) => TEMPLATE_FIELDS.includes(field))).toBe(true);
    expect(rule.statuses.every((status) => ENTRY_STATUSES.includes(status))).toBe(true);
    // The status field is offered exactly when the template has statuses.
    expect(rule.fields.includes('status')).toBe(rule.statuses.length > 0);
    if (rule.statuses.length > 0) {
      expect(rule.statuses).toContain(rule.defaultStatus);
      expect(rule.statuses).toEqual(expect.arrayContaining([...rule.doneStatuses]));
    } else {
      expect(rule.defaultStatus).toBeNull();
      expect(rule.doneStatuses).toEqual([]);
    }
  });

  it('matches the O-022 matrix', () => {
    expect(offersField('NOTE', 'status')).toBe(false);
    expect(offersField('PREFERENCE', 'priority')).toBe(false);
    expect(offersField('TASK', 'date')).toBe(true);
    expect(offersField('TASK', 'price')).toBe(false);
    expect(offersField('WISHLIST', 'price')).toBe(true);
    expect(offersField('EVENT', 'location')).toBe(true);
    expect(offersField(null, 'status')).toBe(false);
  });
});

describe('resolveStatus (O-021)', () => {
  it('gives new entries the template default', () => {
    expect(resolveStatus('TASK', undefined)).toBe('TODO');
    expect(resolveStatus('WISHLIST', undefined)).toBe('SAVED');
    expect(resolveStatus('EVENT', undefined)).toBe('IDEA');
  });

  it('gives no status to Note, Preference, and the Inbox', () => {
    expect(resolveStatus('NOTE', undefined)).toBeNull();
    expect(resolveStatus('PREFERENCE', undefined, 'TODO')).toBeNull();
    expect(resolveStatus(null, undefined, 'TODO')).toBeNull();
  });

  it('accepts only statuses the template offers', () => {
    expect(resolveStatus('TASK', 'IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(() => resolveStatus('TASK', 'PURCHASED')).toThrow(
      expect.objectContaining({ code: 'invalid-status' }),
    );
    expect(() => resolveStatus('TASK', null)).toThrow(
      expect.objectContaining({ code: 'invalid-status' }),
    );
    expect(() => resolveStatus('NOTE', 'TODO')).toThrow(
      expect.objectContaining({ code: 'invalid-status' }),
    );
  });

  it('keeps the current status when unchanged and still offered', () => {
    expect(resolveStatus('TASK', undefined, 'COMPLETED')).toBe('COMPLETED');
    expect(resolveStatus('WISHLIST', undefined, 'COMPLETED')).toBe('SAVED');
  });
});

describe('completedAtFor (O-021)', () => {
  it('sets completed_at when a done status is reached', () => {
    expect(completedAtFor('TASK', 'COMPLETED', { status: 'TODO', completedAt: null }, NOW)).toBe(
      NOW,
    );
    expect(
      completedAtFor('WISHLIST', 'PURCHASED', { status: 'SAVED', completedAt: null }, NOW),
    ).toBe(NOW);
  });

  it('keeps it while the status stays done, clears it otherwise', () => {
    expect(
      completedAtFor('TASK', 'COMPLETED', { status: 'COMPLETED', completedAt: EARLIER }, NOW),
    ).toBe(EARLIER);
    expect(
      completedAtFor('TASK', 'TODO', { status: 'COMPLETED', completedAt: EARLIER }, NOW),
    ).toBeNull();
    expect(completedAtFor('EVENT', 'CANCELLED', { status: 'IDEA', completedAt: null }, NOW)).toBe(
      null,
    );
  });
});

describe('entry field validation (O-027)', () => {
  it('trims titles and enforces the limit from the central table', () => {
    expect(validateTitle('  Synthetic title  ')).toBe('Synthetic title');
    expect(() => validateTitle('   ')).toThrow(expect.objectContaining({ code: 'title-required' }));
    expect(validateTitle('ş'.repeat(LIMITS.title))).toHaveLength(LIMITS.title);
    expect(() => validateTitle('a'.repeat(LIMITS.title + 1))).toThrow(
      expect.objectContaining({ code: 'title-too-long', values: { max: LIMITS.title } }),
    );
  });

  it('accepts known priorities or none', () => {
    expect(validatePriority('HIGH')).toBe('HIGH');
    expect(validatePriority(null)).toBeNull();
    expect(() => validatePriority('URGENT')).toThrow(
      expect.objectContaining({ code: 'invalid-priority' }),
    );
  });
});

describe('foldForSearch (O-026)', () => {
  it('folds Turkish letters and case', () => {
    expect(foldForSearch('ŞULE Çiğdem')).toBe('sule cigdem');
    expect(foldForSearch('İstanbul ISPARTA ılık')).toBe('istanbul isparta ilik');
    expect(foldForSearch('Öğretmen Ünal')).toBe('ogretmen unal');
  });
});
