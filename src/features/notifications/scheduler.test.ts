import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { resetSession, useSession } from '@/store/session';

import * as api from './api';
import { DEFAULT_REMINDER_SETTINGS, type ReminderPerson } from './plan';
import { REMINDER_KIND_TAG } from './routing';
import {
  SYNC_DEBOUNCE_MS,
  cancelAllReminders,
  idsKey,
  requestReminderSync,
  scheduleTestReminder,
  syncReminders,
} from './scheduler';

jest.mock('./api');
const mockApi = jest.mocked(api);

// Device storage in memory (SecureStore is native).
const mockStore = new Map<string, string>();
jest.mock('@/lib/secureStorage', () => ({
  deviceStorage: {
    getItem: async (k: string) => mockStore.get(k) ?? null,
    setItem: async (k: string, v: string) => void mockStore.set(k, v),
    removeItem: async (k: string) => void mockStore.delete(k),
  },
}));

const n = jest.mocked(Notifications);

const person = (id: string, birthdate: string): ReminderPerson => ({
  id,
  first_name: `Name${id}`,
  preferred_name: null,
  birthdate,
  birthday_reminder: true,
  anniversary_date: null,
  anniversary_reminder: false,
  archived_at: null,
  is_self: false,
});

const NOW = new Date(2026, 10, 6, 8, 0);

/** A fake OS schedule so cancel/schedule interplay is observable. */
let scheduled: { identifier: string; content: { data: unknown } }[];
let nextId: number;

beforeEach(() => {
  mockStore.clear();
  scheduled = [];
  nextId = 1;
  resetSession();
  useSession.setState({ status: 'signedIn', userId: 'u1' });
  mockApi.listReminderPeople.mockResolvedValue([
    person('a', '1990-11-07'),
    person('b', '1990-12-01'),
  ]);
  mockApi.getReminderSettings.mockResolvedValue(DEFAULT_REMINDER_SETTINGS);
  n.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' } as never);
  n.getAllScheduledNotificationsAsync.mockImplementation(async () => scheduled as never);
  n.scheduleNotificationAsync.mockImplementation(async (req) => {
    const identifier = `id-${nextId++}`;
    scheduled.push({ identifier, content: req.content as never });
    return identifier;
  });
  n.cancelScheduledNotificationAsync.mockImplementation(async (id) => {
    scheduled = scheduled.filter((s) => s.identifier !== id);
  });
  jest.clearAllMocks();
});

describe('syncReminders', () => {
  it('schedules the plan with date triggers and saves the IDs', async () => {
    const result = await syncReminders(NOW);
    expect(result.scheduled).toBe(2);
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    const first = n.scheduleNotificationAsync.mock.calls[0]![0];
    expect(first.trigger).toMatchObject({ type: 'date', date: new Date(2026, 10, 7, 9) });
    expect(first.content).toMatchObject({
      title: 'Birthday',
      body: "Namea's birthday is today!",
      data: { kind: REMINDER_KIND_TAG, personId: 'a' },
    });
    expect(JSON.parse(mockStore.get(idsKey('u1'))!)).toEqual(['id-1', 'id-2']);
  });

  it('cancels previously scheduled reminders and is idempotent', async () => {
    await syncReminders(NOW);
    await syncReminders(NOW);
    await syncReminders(NOW);
    expect(scheduled).toHaveLength(2);
    expect(JSON.parse(mockStore.get(idsKey('u1'))!)).toHaveLength(2);
  });

  it('removes a reminder after the person is toggled off or deleted', async () => {
    await syncReminders(NOW);
    mockApi.listReminderPeople.mockResolvedValue([person('b', '1990-12-01')]);
    await syncReminders(NOW);
    expect(scheduled.map((s) => (s.content.data as { personId: string }).personId)).toEqual(['b']);
  });

  it('leaves notifications it does not own alone', async () => {
    scheduled.push({ identifier: 'other', content: { data: { kind: 'something-else' } } });
    await syncReminders(NOW);
    await syncReminders(NOW);
    expect(scheduled.some((s) => s.identifier === 'other')).toBe(true);
  });

  it('cancels stored IDs even when the OS list does not show them', async () => {
    mockStore.set(idsKey('u1'), JSON.stringify(['stale']));
    await syncReminders(NOW);
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stale');
  });

  it('cancels everything and schedules nothing without permission', async () => {
    await syncReminders(NOW);
    n.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' } as never);
    const result = await syncReminders(NOW);
    expect(result.scheduled).toBe(0);
    expect(scheduled).toHaveLength(0);
    expect(n.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('cancels everything when signed out', async () => {
    await syncReminders(NOW);
    useSession.setState({ status: 'signedOut', userId: null });
    await syncReminders(NOW);
    expect(scheduled).toHaveLength(0);
    expect(mockStore.size).toBe(0);
  });

  it('respects settings (lead days)', async () => {
    mockApi.getReminderSettings.mockResolvedValue({ ...DEFAULT_REMINDER_SETTINGS, leadDays: 1 });
    mockApi.listReminderPeople.mockResolvedValue([person('a', '1990-11-20')]);
    await syncReminders(NOW);
    expect(n.scheduleNotificationAsync.mock.calls[0]![0].trigger).toMatchObject({
      date: new Date(2026, 10, 19, 9),
    });
  });

  it('is a no-op on web', async () => {
    const original = Platform.OS;
    let web!: typeof import('./scheduler');
    jest.isolateModules(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
      web = jest.requireActual('./scheduler');
    });
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });

    expect((await web.syncReminders(NOW)).scheduled).toBe(0);
    await web.cancelAllReminders();
    await web.requestReminderCancel();
    web.requestReminderSync();
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(n.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mockApi.listReminderPeople).not.toHaveBeenCalled();
  });
});

describe('cancelAllReminders', () => {
  it('removes every reminder and the stored IDs', async () => {
    await syncReminders(NOW);
    await cancelAllReminders();
    expect(scheduled).toHaveLength(0);
    expect(mockStore.has(idsKey('u1'))).toBe(false);
  });
});

describe('requestReminderSync', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('debounces rapid requests into one sync', async () => {
    requestReminderSync();
    requestReminderSync();
    requestReminderSync();
    expect(mockApi.listReminderPeople).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS + 10);
    await jest.advanceTimersByTimeAsync(10);
    expect(mockApi.listReminderPeople).toHaveBeenCalledTimes(1);
  });
});

describe('scheduleTestReminder', () => {
  it('schedules an untagged one-off in a minute for the first person with a birthday', async () => {
    mockApi.findPersonWithBirthday.mockResolvedValue({ id: 'a', name: 'Sam' });
    const result = await scheduleTestReminder(NOW);
    expect(result).toEqual({ name: 'Sam' });
    const req = n.scheduleNotificationAsync.mock.calls[0]![0];
    expect(req.trigger).toMatchObject({ date: new Date(NOW.getTime() + 60_000) });
    expect(req.content.data).toMatchObject({ personId: 'a' });
    expect((req.content.data as { kind: string }).kind).not.toBe(REMINDER_KIND_TAG);
  });

  it('returns null when nobody has a birthday', async () => {
    mockApi.findPersonWithBirthday.mockResolvedValue(null);
    expect(await scheduleTestReminder(NOW)).toBeNull();
  });
});
