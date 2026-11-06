import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="network/new" options={{ title: 'New network', presentation: 'modal' }} />
      <Stack.Screen name="network/[id]/index" options={{ title: 'Network' }} />
      <Stack.Screen name="network/[id]/edit" options={{ title: 'Edit network' }} />
      <Stack.Screen name="person/[id]/index" options={{ title: 'Person' }} />
      <Stack.Screen name="person/[id]/edit" options={{ title: 'Edit person' }} />
      <Stack.Screen name="person/new" options={{ title: 'New person' }} />
      <Stack.Screen
        name="relationship/new"
        options={{ title: 'New relationship', presentation: 'modal' }}
      />
      <Stack.Screen name="study/session" options={{ title: 'Study session' }} />
      <Stack.Screen name="study/complete" options={{ title: 'Study complete' }} />
      <Stack.Screen name="event/[id]/index" options={{ title: 'Event' }} />
      <Stack.Screen
        name="event/[id]/edit"
        options={{ title: 'Edit event', presentation: 'modal' }}
      />
      <Stack.Screen
        name="event/[id]/attendees"
        options={{ title: 'Who is going', presentation: 'modal' }}
      />
      <Stack.Screen name="event/new" options={{ title: 'New event', presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Welcome', headerShown: false }} />
    </Stack>
  );
}
