import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { signUp } from '@/features/auth/api';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { resetSession } from '@/store/session';
import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

const APP_DIR = 'src/app';
const ROW_LABEL = 'My profile: Alex Wenman';

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

// The person form also loads the user's networks; answer that query with one network.
const networksTable = {
  select: () => ({
    order: async () => ({
      data: [
        {
          id: 'n1',
          name: 'Family',
          type: 'family',
          color: 'orange',
          description: null,
          person_count: 1,
        },
      ],
      error: null,
    }),
  }),
};
const from = supabase.from as unknown as jest.Mock;
let originalFrom: ReturnType<typeof from.getMockImplementation>;

beforeEach(() => {
  fakeSupabase.reset();
  resetSession();
  queryClient.clear();
  people = createFakePeople();
  uninstall = people.install();
  originalFrom = from.getMockImplementation();
  from.mockImplementation((table: string) =>
    table === 'networks_with_counts' ? networksTable : originalFrom?.(table),
  );
  // Column defaults from the schema: the fake does not apply them.
  people.seedPerson({
    id: 'self-1',
    first_name: 'Alex',
    last_name: 'Wenman',
    is_self: true,
    birthday_reminder: false,
    anniversary_reminder: false,
  });
  people.seedPerson({ id: 'ana-1', first_name: 'Ana' }, ['n1']);
  fakeSupabase.setStoredSession(true);
});

afterEach(() => {
  uninstall();
  if (originalFrom) from.mockImplementation(originalFrom);
});

describe('My profile', () => {
  it('Settings shows the My profile row and opens the profile form', async () => {
    const r = await renderRouter(APP_DIR, { initialUrl: '/settings' });

    const row = await screen.findByLabelText(ROW_LABEL);
    expect(row).toBeOnTheScreen();
    expect(screen.getByText('Edit your profile')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(row);
    });
    await waitFor(() => expect(r.getPathname()).toBe('/me'));
  });

  it('the me route renders the person form pre-filled with the self person', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/me' });

    expect(await screen.findByText('My profile')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByLabelText('First name *').props.value).toBe('Alex'));
    expect(screen.getByLabelText('Last name').props.value).toBe('Wenman');
    // The self person is in every network, so there is no network picker.
    expect(screen.queryByText('Networks *')).toBeNull();
  });

  it('saving refreshes the Settings row with the new name', async () => {
    const r = await renderRouter(APP_DIR, { initialUrl: '/me' });
    await waitFor(() => expect(screen.getByLabelText('First name *').props.value).toBe('Alex'));

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('First name *'), 'Alexandra');
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() =>
      expect(people.tables.persons!.find((p) => p.id === 'self-1')).toMatchObject({
        first_name: 'Alexandra',
      }),
    );
    // Nothing to go back to (deep link), so save lands on Settings.
    await waitFor(() => expect(r.getPathname()).toBe('/settings'));
    expect(await screen.findByLabelText('My profile: Alexandra Wenman')).toBeOnTheScreen();
  });

  it('sign-up sends the name the database trigger uses for the self person', async () => {
    await signUp({
      name: 'Alex Wenman',
      email: 'alex@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(fakeSupabase.signUpCalls()[0]).toMatchObject({
      options: { data: { name: 'Alex Wenman' } },
    });
  });
});
