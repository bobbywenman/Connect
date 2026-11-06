import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title={`Edit person ${id}`} />;
}
