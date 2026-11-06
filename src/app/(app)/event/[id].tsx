import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title={`Event ${id}`} />;
}
