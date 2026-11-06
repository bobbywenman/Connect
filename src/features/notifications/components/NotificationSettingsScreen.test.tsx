import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import { supabase } from '@/lib/supabase';
import { resetSession, useSession } from '@/store/session';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { requestReminderSync } from '../scheduler';

import { NotificationSettingsScreen } from './NotificationSettingsScreen';

jest.mock('../scheduler', () => ({
  ...jest.requireActual('../scheduler'),
  requestReminderSync: jest.fn(),
}));
const mockSync = jest.mocked(requestReminderSync);

const USER = fakeSupabase.DEMO_USER_ID;
const n = jest.mocked(Notifications);

const from = supabase.from as unknown as jest.Mock;
let originalFrom: ReturnType<typeof from.getMockImplementation>;
let profile: { id: string; settings: unknown; onboarding_complete: boolean };
let writes: unknown[];
let writeError: Error | null;

const GRANTED = { granted: true, status: 'granted', canAskAgain: true };

beforeEach(() => {
  fakeSupabase.reset();
  resetSession();
  mockSync.mockClear();
  n.requestPermissionsAsync.mockClear();
  n.getPermissionsAsync.mockResolvedValue(GRANTED as never);
  n.requestPermissionsAsync.mockResolvedValue(GRANTED as never);

  profile = {
    id: USER,
    onboarding_complete: true,
    settings: { theme: 'light', reminders: { birthdays: true, legacy: 'kept' } },
  };
  writes = [];
  writeError = null;
  originalFrom = from.getMockImplementation();
  // A minimal profiles table: reads return the row, writes merge into it (RLS not simulated).
  from.mockImplementation((table: string) => {
    if (table !== 'profiles') return originalFrom?.(table);
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { ...profile }, error: null }) }),
      }),
      update: (values: { settings: unknown }) => ({
        eq: async () => {
          writes.push(values.settings);
          if (writeError) return { error: writeError };
          profile = { ...profile, settings: values.settings };
          return { error: null };
        },
      }),
    };
  });

  useSession.setState({ status: 'signedIn', userId: USER });
});

afterEach(() => {
  from.mockImplementation(originalFrom);
});

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <QueryClientProvider client={client}>
      <NotificationSettingsScreen />
    </QueryClientProvider>,
  );
}

describe('NotificationSettingsScreen: settings', () => {
  it('shows the stored settings, with defaults for anything unset', async () => {
    await renderScreen();

    expect(await screen.findByRole('switch', { name: 'Birthday reminders' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Anniversary reminders' })).toBeChecked();
    expect(screen.getByRole('switch', { name: "Monthly 'new people' summary" })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Same day' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '9am' })).toBeChecked();
  });

  it('changing the lead time persists it, keeps other keys and re-syncs', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole('radio', { name: '1 week before' }));

    await waitFor(() => expect(mockSync).toHaveBeenCalled());
    expect(writes).toEqual([
      {
        theme: 'light',
        reminders: { birthdays: true, legacy: 'kept', leadDays: 7 },
      },
    ]);
    expect(screen.getByRole('radio', { name: '1 week before' })).toBeChecked();
  });

  it('changing the time of day persists the hour and re-syncs', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole('radio', { name: '6pm' }));

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));
    expect(writes).toEqual([
      expect.objectContaining({ reminders: expect.objectContaining({ hour: 18 }) }),
    ]);
  });

  it('turning a reminder type off persists it and re-syncs', async () => {
    await renderScreen();
    await fireEvent(
      await screen.findByRole('switch', { name: 'Birthday reminders' }),
      'valueChange',
      false,
    );

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));
    expect(writes).toEqual([
      expect.objectContaining({
        reminders: expect.objectContaining({ birthdays: false, legacy: 'kept' }),
      }),
    ]);
    expect(screen.getByRole('switch', { name: 'Birthday reminders' })).not.toBeChecked();
  });

  it('stores the monthly summary switch without scheduling anything new', async () => {
    await renderScreen();
    await fireEvent(
      await screen.findByRole('switch', { name: "Monthly 'new people' summary" }),
      'valueChange',
      true,
    );

    await waitFor(() =>
      expect(writes).toEqual([
        expect.objectContaining({ reminders: expect.objectContaining({ monthlySummary: true }) }),
      ]),
    );
  });

  it('rolls back the choice and says so when the save fails', async () => {
    writeError = new Error('offline');
    await renderScreen();
    await fireEvent.press(await screen.findByRole('radio', { name: '3 days before' }));

    expect(
      await screen.findByText("Couldn't save that change. Check your connection and try again."),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Same day' })).toBeChecked();
    expect(mockSync).not.toHaveBeenCalled();
  });
});

describe('NotificationSettingsScreen: system permission', () => {
  it('says notifications are on when granted', async () => {
    await renderScreen();
    expect(await screen.findByText('Notifications are on')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open Settings' })).toBeNull();
  });

  it('offers Open Settings when denied', async () => {
    n.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'denied',
      canAskAgain: false,
    } as never);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await renderScreen();

    expect(await screen.findByText(/Notifications are off/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalled();
    openSettings.mockRestore();
  });

  it('offers Turn on when not asked yet, and asks the system on press', async () => {
    n.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'undetermined',
      canAskAgain: true,
    } as never);
    await renderScreen();

    expect(await screen.findByText('Not asked yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Turn on' }));

    expect(n.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Notifications are on')).toBeOnTheScreen();
    expect(mockSync).toHaveBeenCalled();
  });

  it('asks for permission the first time a Remind me switch is turned on', async () => {
    n.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'undetermined',
      canAskAgain: true,
    } as never);
    await renderScreen();
    await fireEvent(
      await screen.findByRole('switch', { name: 'Anniversary reminders' }),
      'valueChange',
      true,
    );

    await waitFor(() => expect(n.requestPermissionsAsync).toHaveBeenCalledTimes(1));
  });
});
