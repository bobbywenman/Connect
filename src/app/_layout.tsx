import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { queryClient, setupFocusManager } from '@/lib/queryClient';
import { getGateRedirect } from '@/store/gate';
import { initSession, useSession } from '@/store/session';

/** Auth gate: redirects based on the Supabase-backed session state. */
function useAuthGate() {
  const status = useSession((s) => s.status);
  const onboardingComplete = useSession((s) => s.onboardingComplete);
  const recovery = useSession((s) => s.recovery);
  const segments = useSegments();
  const router = useRouter();
  const target = getGateRedirect({ status, onboardingComplete, recovery }, segments);

  useEffect(() => {
    if (target) router.replace(target as never);
  }, [target, router]);

  return status;
}

export default function RootLayout() {
  useEffect(() => initSession(), []);
  useEffect(() => setupFocusManager(), []);
  const status = useAuthGate();

  return (
    <QueryClientProvider client={queryClient}>
      {status === 'loading' ? (
        // Blank splash while the stored session is read.
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
