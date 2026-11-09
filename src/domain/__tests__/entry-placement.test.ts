import {
  HalfAssignedEntryError,
  INBOX,
  assignedTo,
  isInInbox,
  placementColumns,
  placementFromColumns,
} from '../entry-placement';

describe('entry placement (Inbox rule, B-006)', () => {
  it('reads an entry with neither collection nor category as an Inbox entry', () => {
    expect(placementFromColumns({ collectionId: null, categoryId: null })).toEqual(INBOX);
    expect(isInInbox(INBOX)).toBe(true);
  });

  it('reads an entry with both as assigned', () => {
    const placement = placementFromColumns({ collectionId: 'c1', categoryId: 'k1' });
    expect(placement).toEqual({ kind: 'assigned', collectionId: 'c1', categoryId: 'k1' });
    expect(isInInbox(placement)).toBe(false);
  });

  it.each([
    { collectionId: 'c1', categoryId: null },
    { collectionId: null, categoryId: 'k1' },
    { collectionId: '', categoryId: 'k1' },
    { collectionId: 'c1', categoryId: '  ' },
  ])('rejects half-assigned columns %o', (columns) => {
    expect(() => placementFromColumns(columns)).toThrow(HalfAssignedEntryError);
  });

  it('requires both IDs when assigning', () => {
    expect(() => assignedTo('c1', '')).toThrow(HalfAssignedEntryError);
    expect(() => assignedTo('', 'k1')).toThrow(HalfAssignedEntryError);
  });

  it('round-trips through the stored columns', () => {
    for (const placement of [INBOX, assignedTo('c1', 'k1')]) {
      expect(placementFromColumns(placementColumns(placement))).toEqual(placement);
    }
    expect(placementColumns(INBOX)).toEqual({ collectionId: null, categoryId: null });
  });
});
