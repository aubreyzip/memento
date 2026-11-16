import { useLocalSearchParams } from 'expo-router';

import { PhotoViewerScreen } from '@/features/photos/photo-viewer-screen';

export default function PhotoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PhotoViewerScreen id={id} />;
}
