import { useLocalSearchParams } from 'expo-router';

import { PersonDetailScreen } from '@/features/people/components/PersonDetailScreen';

export default function PersonScreen() {
  const { id, networkId } = useLocalSearchParams<{ id: string; networkId?: string }>();
  return <PersonDetailScreen personId={id} networkId={networkId} />;
}
