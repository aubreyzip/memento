import core from './0001-core';
import catalogLifecycle from './0002-catalog-lifecycle';
import entryFields from './0003-entry-fields';
import linksTags from './0004-links-tags';
import type { Migration } from './migration';

/** All migrations in order. Append new migrations; never reorder or remove released ones. */
export const MIGRATIONS: readonly Migration[] = [core, catalogLifecycle, entryFields, linksTags];
