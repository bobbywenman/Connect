import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { AttendeePickerScreen } from '@/features/events/components/AttendeePickerScreen';

export default function EventAttendeesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AttendeePickerScreen
        eventId={id}
        onClose={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
      />
    </>
  );
}
