import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title={`Person ${id}`} />;
}
