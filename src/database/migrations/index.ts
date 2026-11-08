import core from './0001-core';
import type { Migration } from './migration';

/** All migrations in order. Append new migrations; never reorder or remove released ones. */
export const MIGRATIONS: readonly Migration[] = [core];
