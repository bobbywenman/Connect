// Root-level wiring for reminders (KT-36): foreground handler, sync triggers, tap routing.
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/store/session';

import { ensureReminderPermission, supportsNotifications } from './permissions';
import { responseKey, routeForResponse } from './routing';
import { requestReminderCancel, requestReminderSync } from './scheduler';

/** Show reminders as a banner even while the app is open (iOS otherwise hides them). */
export function configureNotificationHandler() {
  if (!supportsNotifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Sync after sign-in/session restore and on every foreground; cancel everything on sign-out. */
export function useReminderSync() {
  const status = useSession((s) => s.status);

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!supportsNotifications) return;
    if (status === 'signedIn') requestReminderSync({ immediate: true });
    else if (status === 'signedOut') void requestReminderCancel();
  }, [status]);

  useEffect(() => {
    if (!supportsNotifications) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useSession.getState().status === 'signedIn') requestReminderSync();
    });
    return () => sub.remove();
  }, []);
}

function useNativeNotificationNavigation() {
  const router = useRouter();
  const status = useSession((s) => s.status);
  const onboardingComplete = useSession((s) => s.onboardingComplete);
  const recovery = useSession((s) => s.recovery);
  // undefined until known. Covers a cold start from a tap and taps while the app is running
  // (the hook subscribes to the response listener itself).
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const key = responseKey(response);
    if (handled.current === key) return;
    const route = routeForResponse(response);
    if (!route) return;
    // Wait for the auth gate: it decides whether the app may be shown at all.
    if (status !== 'signedIn' || !onboardingComplete || recovery) return;
    handled.current = key;
    router.push(route as never);
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, status, onboardingComplete, recovery, router]);
}

/** Opens the person when a reminder is tapped. A no-op on web. */
export const useNotificationNavigation = supportsNotifications
  ? useNativeNotificationNavigation
  : () => {};

/** For a Remind me switch: prompts on first enable, and exposes whether the user has denied it. */
export function useReminderPermission() {
  const [denied, setDenied] = useState(false);
  const onEnable = useCallback(async () => {
    const result = await ensureReminderPermission();
    setDenied(result === 'denied');
    if (result === 'granted') requestReminderSync();
  }, []);
  const onDisable = useCallback(() => setDenied(false), []);
  return { denied, onEnable, onDisable };
}
