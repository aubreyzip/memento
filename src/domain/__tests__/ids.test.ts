import { randomUUID } from 'node:crypto';

import { BUILT_IN_CATEGORIES, BUILT_IN_COLLECTION_TYPES } from '../catalog';
import { BUILT_IN_TABLE, builtInId, isBuiltInId } from '../ids';

describe('built-in IDs (O-020, O-038)', () => {
  it('matches the documented examples', () => {
    expect(builtInId(BUILT_IN_TABLE.collectionTypes, 1)).toBe(
      '4d454d30-0000-8000-8000-000000000001',
    );
    expect(builtInId(BUILT_IN_TABLE.categories, 1)).toBe('4d454d30-0000-8000-8001-000000000001');
  });

  it('every built-in ID is in the reserved namespace and unique', () => {
    const ids = [...BUILT_IN_COLLECTION_TYPES, ...BUILT_IN_CATEGORIES].map((row) => row.id);
    expect(ids.every(isBuiltInId)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('random v4 UUIDs are never in the namespace, even with the same prefix', () => {
    for (let i = 0; i < 10_000; i++) expect(isBuiltInId(randomUUID())).toBe(false);
    expect(isBuiltInId('4d454d30-1234-4abc-8def-0123456789ab')).toBe(false);
  });

  it.each([
    [-1, 1],
    [0x1000, 1],
    [0, 0],
    [0, 1.5],
  ])('rejects table %p / sequence %p', (table, sequence) => {
    expect(() => builtInId(table, sequence)).toThrow(RangeError);
  });
});
