import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import type { PersonConnection } from '../api';
import { RelationshipBadges } from './RelationshipBadges';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

const rob = { id: 'rob', is_self: false };
const maria = {
  id: 'mia',
  first_name: 'Maria',
  last_name: null,
  preferred_name: null,
  photo_path: null,
  updated_at: '',
  is_self: false,
  archived_at: null,
  job_title: null,
  tags: [],
};
const connections: PersonConnection[] = [
  {
    relationship: {
      id: 'r1',
      source_person_id: 'rob',
      target_person_id: 'mia',
      type: 'cousin',
      inverse_type: 'cousin',
      custom_label: null,
      inverse_custom_label: null,
    },
    person: maria,
  },
];

async function renderBadges() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <RelationshipBadges person={rob} connections={connections} />
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  fakeSupabase.reset();
  jest.clearAllMocks();
  people = createFakePeople();
  uninstall = people.install();
  people.seedPerson({ id: 'rob', first_name: 'Robert' });
  people.seedPerson({ id: 'mia', first_name: 'Maria' });
  people.seedRelationship({
    id: 'r1',
    source_person_id: 'rob',
    target_person_id: 'mia',
    type: 'cousin',
    inverse_type: 'cousin',
  });
});
afterEach(() => uninstall());

describe('RelationshipBadges', () => {
  it('renders nothing without relationships', async () => {
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <RelationshipBadges person={rob} connections={[]} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens a menu with change, remove and cancel when a badge is tapped', async () => {
    await renderBadges();

    await fireEvent.press(screen.getByRole('button', { name: 'Cousin of Maria' }));

    expect(screen.getByRole('button', { name: 'Change relationship' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  });

  it('opens the change flow for that relationship from this person', async () => {
    await renderBadges();
    await fireEvent.press(screen.getByRole('button', { name: 'Cousin of Maria' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Change relationship' }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/relationship/[id]/edit',
        params: { id: 'r1', personId: 'rob' },
      }),
    );
  });

  it('asks before removing, naming the relationship, and removes it on confirm', async () => {
    const client = await renderBadges();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await fireEvent.press(screen.getByRole('button', { name: 'Cousin of Maria' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText("Remove 'Cousin of Maria'?")).toBeOnTheScreen();
    expect(people.tables.relationships).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(people.tables.relationships).toHaveLength(0));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    // Both people's pages and every network list label refresh.
    expect(keys).toContainEqual(['person']);
    expect(keys).toContainEqual(['persons']);
  });

  it('keeps the relationship when the confirmation is cancelled', async () => {
    await renderBadges();
    await fireEvent.press(screen.getByRole('button', { name: 'Cousin of Maria' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    await screen.findByText("Remove 'Cousin of Maria'?");

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(people.tables.relationships).toHaveLength(1);
  });

  it('shows an error when removing fails', async () => {
    people.failOn('relationships', 'delete', new Error('offline'));
    await renderBadges();
    await fireEvent.press(screen.getByRole('button', { name: 'Cousin of Maria' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    await screen.findByText("Remove 'Cousin of Maria'?");

    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText(/Couldn't remove the relationship/)).toBeOnTheScreen();
  });
});
