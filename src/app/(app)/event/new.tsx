import { Stack, useRouter } from 'expo-router';

import { EventFormScreen } from '@/features/events/components/EventFormScreen';

export default function NewEventScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EventFormScreen
        mode="create"
        onSaved={(id) => router.replace({ pathname: '/event/[id]', params: { id } })}
        onCancel={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
      />
    </>
  );
}
