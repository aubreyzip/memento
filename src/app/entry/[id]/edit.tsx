import { useLocalSearchParams } from 'expo-router';

import { EntryFormScreen } from '@/features/entries/entry-form-screen';

export default function EditEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntryFormScreen id={id} />;
}
