import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { usePhotoUrl, usePhotoUrls } from '../photoHooks';
import { PersonDetailScreen } from './PersonDetailScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
  // Render the header buttons inline so tests can press them.
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => unknown } }) =>
      options?.headerRight?.() ?? null,
  },
}));
jest.mock('../photoHooks');

const TODAY = new Date(2026, 10, 6, 12); // Nov 6 2026

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

function seed() {
  people.seedNetwork({ id: 'n1', name: 'Family', color: 'green' });
  people.seedNetwork({ id: 'n2', name: 'Book club', color: 'blue' });
  people.seedPerson({ id: 'me', first_name: 'Alex', last_name: 'Wenman', is_self: true });
  people.seedPerson(
    {
      id: 'rob',
      first_name: 'Robert',
      last_name: 'Wenman',
      preferred_name: 'Bob',
      pronouns: 'he/him',
      birthdate: '1960-11-18',
      anniversary_date: '1985-11-06',
      location_city: 'Leeds',
      job_title: 'Engineer',
      company: 'Acme',
      department: '  ',
      notes: 'Loves sailing',
      tags: ['Sailing'],
      fun_facts: 'Once met the Queen',
      conversation_starters: null,
    },
    ['n1', 'n2'],
  );
  people.seedPerson({ id: 'mia', first_name: 'Maria', last_name: 'Wenman' }, ['n1']);
  people.seedPerson({ id: 'solo', first_name: 'Sol' }, ['n1']);
  people.seedRelationship({
    id: 'r1',
    source_person_id: 'rob',
    target_person_id: 'mia',
    type: 'cousin',
    inverse_type: 'cousin',
  });
  people.seedRelationship({
    id: 'r2',
    source_person_id: 'me',
    target_person_id: 'rob',
    type: 'child',
    inverse_type: 'parent',
  });
}

async function renderScreen(personId: string, networkId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <PersonDetailScreen personId={personId} networkId={networkId} today={TODAY} />
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  fakeSupabase.reset();
  jest.clearAllMocks();
  mockCanGoBack = true;
  jest.mocked(usePhotoUrl).mockReturnValue(null);
  jest
    .mocked(usePhotoUrls)
    .mockReturnValue({ data: {} } as unknown as ReturnType<typeof usePhotoUrls>);
  people = createFakePeople();
  uninstall = people.install();
  seed();
});
afterEach(() => uninstall());

describe('PersonDetailScreen states', () => {
  it('shows a skeleton, then the person', async () => {
    await renderScreen('rob');
    expect(screen.getByTestId('person-loading')).toBeOnTheScreen();
    expect(await screen.findByText('Robert Wenman')).toBeOnTheScreen();
  });

  it('shows not found with a way back', async () => {
    await renderScreen('ghost');
    expect(await screen.findByText('Person not found')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows an error and retries', async () => {
    people.failOn('persons', 'select', new Error('offline'));
    await renderScreen('rob');
    expect(await screen.findByText("Couldn't load this person")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
  });
});

describe('PersonDetailScreen content', () => {
  it('shows every filled field and hides the empty ones', async () => {
    await renderScreen('rob');
    await screen.findByText('Robert Wenman');

    expect(screen.getByText('Goes by Bob · he/him')).toBeOnTheScreen();
    expect(screen.getByText('Family')).toBeOnTheScreen();
    expect(screen.getByText('Book club')).toBeOnTheScreen();
    expect(screen.getByText('Cousin of Maria')).toBeOnTheScreen();
    expect(screen.getByText('Your parent')).toBeOnTheScreen();
    expect(screen.getByText('November 18, 1960 · in 12 days')).toBeOnTheScreen();
    expect(screen.getByText('November 6, 1985 · today')).toBeOnTheScreen();
    expect(screen.getByText('Leeds')).toBeOnTheScreen();
    expect(screen.getByText('Engineer')).toBeOnTheScreen();
    expect(screen.getByText('Acme')).toBeOnTheScreen();
    expect(screen.getByText('Loves sailing')).toBeOnTheScreen();
    expect(screen.getByText('Sailing')).toBeOnTheScreen();
    expect(screen.getByText('Once met the Queen')).toBeOnTheScreen();

    // Blank or empty fields leave no label or heading behind.
    expect(screen.queryByText('Department')).toBeNull();
    expect(screen.queryByText('Conversation starters')).toBeNull();
    expect(screen.queryByText('You')).toBeNull();
  });

  it('hides every optional section for a person with only a name', async () => {
    await renderScreen('solo');
    await screen.findByText('Sol');
    for (const heading of [
      'Details',
      'Notes',
      'Groups & tags',
      'Fun facts',
      'Conversation starters',
    ]) {
      expect(screen.queryByText(heading)).toBeNull();
    }
    expect(screen.queryByText(/Connections/)).toBeNull();
  });

  it('lists connections, You first, and opens one on tap', async () => {
    await renderScreen('rob');
    await screen.findByText('Robert Wenman');
    expect(screen.getByText('Connections (2)')).toBeOnTheScreen();
    expect(screen.getByText("You · Bob's child")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Maria Wenman, Bob's cousin"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]', params: { id: 'mia' } });
  });

  it('marks the self person and offers no destructive actions', async () => {
    await renderScreen('me');
    expect(await screen.findByText('Alex Wenman')).toBeOnTheScreen();
    expect(screen.getByText('You')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edit person' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    // Their own page names relationships from their side.
    expect(screen.getByText('Your parent')).toBeOnTheScreen();
  });

  it('shows the person photo and passes a cache key', async () => {
    people.tables.persons!.find((p) => p.id === 'rob')!.photo_path = 'rob.jpg';
    people.tables.persons!.find((p) => p.id === 'rob')!.updated_at = 'v7';
    jest.mocked(usePhotoUrl).mockReturnValue('https://img.test/rob.jpg');
    await renderScreen('rob');
    await screen.findByText('Robert Wenman');
    expect(usePhotoUrl).toHaveBeenCalledWith('rob.jpg', 'v7');
    expect(screen.getByLabelText('Photo of Robert Wenman')).toBeOnTheScreen();
  });

  it('navigates to edit and to add relationship', async () => {
    await renderScreen('rob');
    await screen.findByText('Robert Wenman');
    await fireEvent.press(screen.getByRole('button', { name: 'Edit person' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]/edit', params: { id: 'rob' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Add relationship' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/relationship/new',
      params: { personId: 'rob' },
    });
  });
});

describe('PersonDetailScreen menu actions', () => {
  async function openMenu(personId: string, networkId?: string) {
    const client = await renderScreen(personId, networkId);
    await fireEvent.press(await screen.findByRole('button', { name: 'More actions' }));
    return client;
  }

  it('offers Archive and Delete, plus Remove from <network> only in a network context', async () => {
    await openMenu('rob');
    expect(screen.getByRole('button', { name: 'Archive' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Remove from/ })).toBeNull();
  });

  it('archives and returns to the list', async () => {
    await openMenu('rob', 'n1');
    expect(screen.getByRole('button', { name: 'Remove from Family' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.persons!.find((p) => p.id === 'rob')?.archived_at).toEqual(
      expect.any(String),
    );
  });

  it('asks before deleting, then deletes with relationships and goes back', async () => {
    await openMenu('rob');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete Bob?')).toBeOnTheScreen();
    expect(screen.getByText(/2 relationships/)).toBeOnTheScreen();
    expect(people.tables.persons!.some((p) => p.id === 'rob')).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete Bob' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.persons!.some((p) => p.id === 'rob')).toBe(false);
    expect(people.tables.relationships).toEqual([]);
  });

  it('cancelling the delete confirmation deletes nothing', async () => {
    await openMenu('rob');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByText('Delete Bob?');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(people.tables.persons!.some((p) => p.id === 'rob')).toBe(true);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('falls back to the home route after delete when there is no history', async () => {
    mockCanGoBack = false;
    await openMenu('mia');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete Maria' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('removes from one network without a warning when they are in others', async () => {
    await openMenu('rob', 'n1');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove from Family' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const mine = people.tables.network_members!.filter((m) => m.person_id === 'rob');
    expect(mine.map((m) => m.network_id)).toEqual(['n2']);
  });

  it('warns before removing the last network and offers delete instead', async () => {
    await openMenu('mia', 'n1');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove from Family' }));
    expect(await screen.findByText("Maria won't be in any network")).toBeOnTheScreen();
    expect(people.tables.network_members!.some((m) => m.person_id === 'mia')).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove anyway' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.network_members!.some((m) => m.person_id === 'mia')).toBe(false);
    expect(people.tables.persons!.some((p) => p.id === 'mia')).toBe(true);
  });

  it('shows an error when the change fails and stays on the page', async () => {
    people.failOn('persons', 'update', new Error('offline'));
    await openMenu('rob');
    await fireEvent.press(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText("Couldn't archive Bob. Try again.")).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('PersonDetailScreen archived person', () => {
  beforeEach(() => {
    people.tables.persons!.find((p) => p.id === 'rob')!.archived_at = '2026-01-01T00:00:00Z';
  });

  it('shows a banner with Restore, which restores them', async () => {
    const client = await renderScreen('rob');
    expect(await screen.findByText(/Archived\. Bob is hidden/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Add relationship' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() =>
      expect(people.tables.persons!.find((p) => p.id === 'rob')?.archived_at).toBeNull(),
    );
    await waitFor(() => expect(screen.queryByText(/Archived\. Bob is hidden/)).toBeNull());
    client.clear();
  });
});
