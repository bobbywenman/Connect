import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { EventFormScreen } from '@/features/events/components/EventFormScreen';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EventFormScreen
        mode="edit"
        eventId={id}
        onSaved={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
        onCancel={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
      />
    </>
  );
}
