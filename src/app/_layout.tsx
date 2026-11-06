import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { getGateRedirect } from '@/store/gate';
import { useSession } from '@/store/session';

/** Auth gate: redirects based on session state. Replaced by real auth in KT-06. */
function useAuthGate() {
  const session = useSession();
  const segments = useSegments();
  const router = useRouter();
  const target = getGateRedirect(session, segments);

  useEffect(() => {
    if (target) router.replace(target as never);
  }, [target, router]);
}

export default function RootLayout() {
  useAuthGate();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </>
  );
}
