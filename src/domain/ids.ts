/**
 * Reserved namespace for built-in rows (O-020, O-038): RFC 9562 version-8 UUIDs with the prefix
 * `4d454d30` ("MEM0"). User-created rows use random v4 UUIDs (version digit 4), so they can
 * never fall inside this namespace.
 */
export const BUILT_IN_ID_PREFIX = '4d454d30-';
export const BUILT_IN_ID_PATTERN = /^4d454d30-0000-8000-8[0-9a-f]{3}-[0-9a-f]{12}$/;

/** Table codes used in the third group of built-in IDs (`8TTT`). */
export const BUILT_IN_TABLE = {
  collectionTypes: 0x000,
  categories: 0x001,
} as const;

export function builtInId(table: number, sequence: number): string {
  if (!Number.isInteger(table) || table < 0 || table > 0xfff) {
    throw new RangeError(`Invalid built-in table code: ${table}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 0xffffffffffff) {
    throw new RangeError(`Invalid built-in sequence: ${sequence}`);
  }
  const t = table.toString(16).padStart(3, '0');
  const n = sequence.toString(16).padStart(12, '0');
  return `${BUILT_IN_ID_PREFIX}0000-8000-8${t}-${n}`;
}

export function isBuiltInId(id: string): boolean {
  return BUILT_IN_ID_PATTERN.test(id);
}
