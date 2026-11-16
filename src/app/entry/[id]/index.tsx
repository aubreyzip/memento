import { useLocalSearchParams } from 'expo-router';

import { EntryDetailScreen } from '@/features/entries/entry-detail-screen';

export default function EntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntryDetailScreen id={id} />;
}
