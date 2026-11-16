import { useLocalSearchParams } from 'expo-router';

import { CollectionDetailScreen } from '@/features/catalog/collection-detail-screen';

export default function CollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CollectionDetailScreen id={id} />;
}
