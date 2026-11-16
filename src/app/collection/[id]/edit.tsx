import { useLocalSearchParams } from 'expo-router';

import { CollectionFormScreen } from '@/features/catalog/collection-form-screen';

export default function EditCollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CollectionFormScreen id={id} />;
}
