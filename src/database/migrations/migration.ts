/**
 * One numbered migration. Each migration is a module in this folder named `NNNN-name.ts` whose
 * `sql` is a plain SQL script (TypeScript modules so Metro and Jest load them without custom
 * transformers). Once released, a migration is frozen; changes go in a new migration (O-040).
 */
export type Migration = {
  /** Sequential, starting at 1. Becomes `PRAGMA user_version` after the migration runs. */
  version: number;
  name: string;
  sql: string;
};
