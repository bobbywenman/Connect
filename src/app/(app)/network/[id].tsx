import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';

export default function NetworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title={`Network ${id}`} />;
}
