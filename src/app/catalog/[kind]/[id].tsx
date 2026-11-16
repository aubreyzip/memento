import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { CatalogItemFormScreen } from '@/features/catalog/catalog-item-form-screen';
import { isCatalogKind } from '@/features/catalog/catalog-screen';

export default function EditCatalogItemRoute() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  if (!isCatalogKind(kind)) return <PlaceholderScreen />;
  return <CatalogItemFormScreen kind={kind} id={id} />;
}
