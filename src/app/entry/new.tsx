import { useLocalSearchParams } from 'expo-router';

import { EntryFormScreen } from '@/features/entries/entry-form-screen';

export default function NewEntryRoute() {
  const { collectionId } = useLocalSearchParams<{ collectionId?: string }>();
  return <EntryFormScreen collectionId={collectionId} />;
}
