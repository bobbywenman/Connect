// Schedules local reminders (KT-36, D-10). Only the NEXT occurrence of each date is scheduled
// (date triggers), so everything is re-planned on launch, foreground and after person edits.
// That also copes with iOS' 64 pending-notification limit and with a reinstall or new device.
// Notification IDs live on this device: tagged on the notification itself, and listed in device storage.
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { deviceStorage } from '@/lib/secureStorage';
import { useSession } from '@/store/session';

import { findPersonWithBirthday, getReminderSettings, listReminderPeople } from './api';
import { isAllowed, supportsNotifications } from './permissions';
import { planReminders } from './plan';
import { REMINDER_KIND_TAG } from './routing';

export const ANDROID_CHANNEL_ID = 'reminders';
export const SYNC_DEBOUNCE_MS = 1500;

export const idsKey = (userId: string) => `knowthem.reminderIds.${userId}`;
export const LAST_USER_KEY = 'knowthem.reminderUser';

async function readIds(key: string): Promise<string[]> {
  try {
    const raw = await deviceStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Birthday and anniversary reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

const channel = () => (Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {});

/** Cancels every reminder this app scheduled: those tagged on the notification plus the ones we stored. */
async function cancelOurs(userIds: (string | null)[]): Promise<void> {
  const ids = new Set<string>();
  for (const request of await Notifications.getAllScheduledNotificationsAsync()) {
    const data = request.content.data as { kind?: unknown } | null | undefined;
    if (data?.kind === REMINDER_KIND_TAG) ids.add(request.identifier);
  }
  for (const userId of userIds) {
    if (userId) (await readIds(idsKey(userId))).forEach((id) => ids.add(id));
  }
  await Promise.all([...ids].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/** Cancels all reminders and forgets their IDs (sign-out, or notifications turned off in system settings). */
export async function cancelAllReminders(): Promise<void> {
  if (!supportsNotifications) return;
  const users = [useSession.getState().userId, await deviceStorage.getItem(LAST_USER_KEY)];
  await cancelOurs(users);
  for (const userId of users) {
    if (userId) await deviceStorage.removeItem(idsKey(userId));
  }
  await deviceStorage.removeItem(LAST_USER_KEY);
}

export interface SyncResult {
  scheduled: number;
}

/**
 * Rebuilds the schedule from the database: cancels the previous KnowThem reminders and schedules
 * the current plan. Idempotent. Needs notification permission already granted (it never prompts).
 */
export async function syncReminders(now: Date = new Date()): Promise<SyncResult> {
  if (!supportsNotifications) return { scheduled: 0 };
  const userId = useSession.getState().userId;
  if (!userId) {
    await cancelAllReminders();
    return { scheduled: 0 };
  }

  if (!isAllowed(await Notifications.getPermissionsAsync())) {
    await cancelAllReminders();
    return { scheduled: 0 };
  }

  const [people, settings] = await Promise.all([
    listReminderPeople(userId),
    getReminderSettings(userId),
  ]);
  const plan = planReminders(people, settings, now);

  await cancelOurs([userId, await deviceStorage.getItem(LAST_USER_KEY)]);
  await ensureAndroidChannel();

  const ids: string[] = [];
  for (const reminder of plan) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { kind: REMINDER_KIND_TAG, personId: reminder.personId, type: reminder.kind },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          ...channel(),
        },
      }),
    );
  }
  await deviceStorage.setItem(idsKey(userId), JSON.stringify(ids));
  await deviceStorage.setItem(LAST_USER_KEY, userId);
  return { scheduled: ids.length };
}

// Serialise syncs so two overlapping runs can't both cancel and then both schedule (duplicates).
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Asks for a re-sync soon. Rapid calls (several edits, foreground + sign-in) collapse into one run.
 * Failures are swallowed: the next launch or foreground retries.
 */
export function requestReminderSync(options: { immediate?: boolean } = {}): void {
  if (!supportsNotifications) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    () => {
      timer = null;
      void enqueue(() => syncReminders()).catch(() => undefined);
    },
    options.immediate ? 0 : SYNC_DEBOUNCE_MS,
  );
  (timer as { unref?: () => void }).unref?.();
}

/** Cancels all reminders now, dropping any pending debounced sync (sign-out). */
export function requestReminderCancel(): Promise<void> {
  if (!supportsNotifications) return Promise.resolve();
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return enqueue(cancelAllReminders).catch(() => undefined);
}

/** Dev only: a one-off notification in 60 seconds for the first person with a birthday. */
export async function scheduleTestReminder(
  now: Date = new Date(),
): Promise<{ name: string } | null> {
  const userId = useSession.getState().userId;
  if (!supportsNotifications || !userId) return null;
  const person = await findPersonWithBirthday(userId);
  if (!person) return null;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Birthday',
      body: `${person.name}'s birthday is today!`,
      // Not tagged as a reminder, so the next sync doesn't cancel it.
      data: { kind: 'knowthem-test', personId: person.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(now.getTime() + 60_000),
      ...channel(),
    },
  });
  return { name: person.name };
}
