import { useLocalSearchParams } from 'expo-router';

import { AssignEntryScreen } from '@/features/entries/assign-entry-screen';

export default function AssignEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AssignEntryScreen id={id} />;
}
