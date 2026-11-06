import { useLocalSearchParams } from 'expo-router';

import { EventDetailScreen } from '@/features/events/components/EventDetailScreen';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventDetailScreen eventId={id} />;
}
