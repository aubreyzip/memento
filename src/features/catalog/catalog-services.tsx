import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import type { SqlDatabase } from '@/database/connection/sql-database';
import { PhotoService } from '@/features/photos/photo-service';
import type { MediaPorts } from '@/features/photos/ports';
import { SqliteAttachmentRepository } from '@/repositories/attachment-repository';
import {
  SqliteCategoryRepository,
  SqliteCollectionTypeRepository,
  type CategoryRepository,
  type CollectionTypeRepository,
} from '@/repositories/catalog-repositories';
import {
  SqliteCollectionRepository,
  type CollectionRepository,
} from '@/repositories/collection-repository';
import { SqliteEntryRepository, type EntryRepository } from '@/repositories/entry-repository';
import type { RepositoryDeps } from '@/repositories/repository-deps';

/** The repositories the collection, catalog, and entry screens use. Screens never see SQL. */
export type CatalogServices = {
  collectionTypes: CollectionTypeRepository;
  categories: CategoryRepository;
  collections: CollectionRepository;
  entries: EntryRepository;
  /** Photos, and deletions that must also remove photo files (entries, collections). */
  photos: PhotoService;
};

export function createCatalogServices(
  db: SqlDatabase,
  deps: RepositoryDeps,
  media: MediaPorts,
): CatalogServices {
  const collections = new SqliteCollectionRepository(db, deps);
  const entries = new SqliteEntryRepository(db, deps);
  return {
    collectionTypes: new SqliteCollectionTypeRepository(db, deps),
    categories: new SqliteCategoryRepository(db, deps),
    collections,
    entries,
    photos: new PhotoService({
      ...media,
      attachments: new SqliteAttachmentRepository(db, deps.now),
      entries,
      collections,
      newId: deps.newId,
    }),
  };
}

const CatalogContext = createContext<CatalogServices | null>(null);

export function CatalogServicesProvider({
  services,
  children,
}: {
  services: CatalogServices;
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={services}>{children}</CatalogContext.Provider>;
}

export function useCatalogServices(): CatalogServices {
  const services = useContext(CatalogContext);
  if (!services) throw new Error('CatalogServicesProvider is not mounted');
  return services;
}

/**
 * Loads data whenever the screen gains focus, so lists are fresh after returning from a form.
 * `load` receives the services; `reload` re-runs it after a change made on the same screen.
 */
export function useCatalogData<T>(load: (services: CatalogServices) => Promise<T>) {
  const services = useCatalogServices();
  const [data, setData] = useState<T | undefined>(undefined);
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      load(services).then((next) => current && setData(next));
      return () => {
        current = false;
      };
      // `load` is an inline function; re-running on its identity would loop. `version` reloads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services, version]),
  );

  return { data, reload: () => setVersion((v) => v + 1) };
}
