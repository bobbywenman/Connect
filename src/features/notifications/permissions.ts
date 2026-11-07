// Notification permission (KT-36). Never requested at app start: only when the user first turns a
// reminder on. Nothing about permission is stored in the database.
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export type ReminderPermission = 'granted' | 'undetermined' | 'denied' | 'unavailable';

export const supportsNotifications = Platform.OS !== 'web';

export function isAllowed(res: Notifications.NotificationPermissionsStatus): boolean {
  return res.granted || res.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

function toPermission(res: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (isAllowed(res)) return 'granted';
  if (res.status === 'undetermined' && res.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!supportsNotifications) return 'unavailable';
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

/** Shows the system prompt (iOS asks once; afterwards the answer is only changeable in Settings). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!supportsNotifications) return 'unavailable';
  try {
    return toPermission(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      }),
    );
  } catch {
    return 'unavailable';
  }
}

/**
 * Called when a Remind me switch flips on. Prompts only if permission is undetermined, and
 * returns the resulting state so the form can show an "Open Settings" hint when denied.
 */
export async function ensureReminderPermission(): Promise<ReminderPermission> {
  const current = await getReminderPermission();
  return current === 'undetermined' ? requestReminderPermission() : current;
}

export function openNotificationSettings(): Promise<void> {
  return Linking.openSettings();
}
