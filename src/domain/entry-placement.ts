/**
 * Inbox rule (B-006, B-007): an entry is either unsorted (in the Quick Capture Inbox, with no
 * collection and no category) or assigned (with both). Half-assigned entries are not
 * representable here, and the `entries` table rejects them with a CHECK constraint.
 */
export type EntryPlacement =
  { kind: 'inbox' } | { kind: 'assigned'; collectionId: string; categoryId: string };

export type PlacementColumns = { collectionId: string | null; categoryId: string | null };

export const INBOX: EntryPlacement = { kind: 'inbox' };

export class HalfAssignedEntryError extends Error {
  constructor() {
    super('An entry needs both a collection and a category, or neither (Inbox)');
    this.name = 'HalfAssignedEntryError';
  }
}

const isId = (value: string | null): value is string => value !== null && value.trim() !== '';

/** Builds an assigned placement; both IDs are required (moving out of the Inbox is atomic). */
export function assignedTo(collectionId: string, categoryId: string): EntryPlacement {
  if (!isId(collectionId) || !isId(categoryId)) throw new HalfAssignedEntryError();
  return { kind: 'assigned', collectionId, categoryId };
}

/** Reads a placement from stored columns; rejects half-assigned rows instead of guessing. */
export function placementFromColumns({
  collectionId,
  categoryId,
}: PlacementColumns): EntryPlacement {
  if (collectionId === null && categoryId === null) return INBOX;
  if (isId(collectionId) && isId(categoryId)) return assignedTo(collectionId, categoryId);
  throw new HalfAssignedEntryError();
}

/** The column values to store for a placement. */
export function placementColumns(placement: EntryPlacement): PlacementColumns {
  return placement.kind === 'inbox'
    ? { collectionId: null, categoryId: null }
    : { collectionId: placement.collectionId, categoryId: placement.categoryId };
}

export const isInInbox = (placement: EntryPlacement) => placement.kind === 'inbox';
