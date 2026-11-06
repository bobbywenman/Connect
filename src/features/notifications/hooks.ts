// Root-level wiring for reminders (KT-36): foreground handler, sync triggers, tap routing.
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Profile } from '@/features/profile/api';
import { useMyProfile } from '@/features/profile/hooks';
import { queryKeys } from '@/lib/queryKeys';
import { useSession } from '@/store/session';

import { updateReminderSettings } from './api';
import { mergeReminderSettings, parseReminderSettings, type ReminderSettingsPatch } from './plan';
import {
  ensureReminderPermission,
  getReminderPermission,
  supportsNotifications,
  type ReminderPermission,
} from './permissions';
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

/** The reminder settings in `profiles.settings.reminders`, with defaults for anything unset. */
export function useReminderSettings() {
  const profile = useMyProfile();
  const settings = useMemo(
    () => (profile.data ? parseReminderSettings(profile.data.settings) : undefined),
    [profile.data],
  );
  return {
    settings,
    isPending: profile.isPending,
    isError: profile.isError,
    refetch: profile.refetch,
  };
}

/**
 * Saves part of the reminder settings. The cache is updated at once and rolled back on failure.
 * On success the schedule is re-synced so the change takes effect (D-16).
 */
export function useUpdateReminderSettings() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.userId);
  return useMutation({
    // Writes run one at a time, so each read-modify-write sees the previous one's result.
    scope: { id: 'reminder-settings' },
    mutationFn: (patch: ReminderSettingsPatch) => updateReminderSettings(userId as string, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });
      const previous = queryClient.getQueryData<Profile | null>(queryKeys.profile);
      if (previous) {
        queryClient.setQueryData<Profile>(queryKeys.profile, {
          ...previous,
          settings: mergeReminderSettings(previous.settings, patch) as Profile['settings'],
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.profile, context.previous);
      }
    },
    onSuccess: () => requestReminderSync(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}

/**
 * The system permission state for the settings screen, plus `enable` (asks once, when undetermined).
 * Re-read on every focus (staleTime 0), so it updates after the user returns from system Settings.
 */
export function useReminderPermissionStatus() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.reminderPermission,
    queryFn: getReminderPermission,
    staleTime: 0,
  });
  const enable = useCallback(async (): Promise<ReminderPermission> => {
    const result = await ensureReminderPermission();
    queryClient.setQueryData(queryKeys.reminderPermission, result);
    if (result === 'granted') requestReminderSync();
    return result;
  }, [queryClient]);
  return { status: query.data, isPending: query.isPending, enable };
}
