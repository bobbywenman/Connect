import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { DuplicatesRow } from './DuplicatesRow';
import { DuplicatesScreen } from './DuplicatesScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

beforeEach(() => {
  fakeSupabase.reset();
  mockPush.mockClear();
  fakeSupabase.setNetworks([
    { id: 'n1', name: 'Wenman Family' },
    { id: 'n2', name: 'Work' },
  ]);
  people = createFakePeople();
  uninstall = people.install();
  people.seedPerson({ id: 'a', first_name: 'Robert', last_name: 'Wenman' }, ['n1']);
  people.seedPerson({ id: 'b', first_name: 'Robert', last_name: 'Wenman' }, ['n2']);
  people.seedPerson({ id: 'c', first_name: 'Robert', last_name: 'Smith' }, ['n2']);
});
afterEach(() => uninstall());

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('DuplicatesScreen', () => {
  it('lists each pair side by side with names and networks', async () => {
    await renderWithClient(<DuplicatesScreen />);
    expect(await screen.findByLabelText('Robert Wenman, Wenman Family')).toBeOnTheScreen();
    expect(screen.getByLabelText('Robert Wenman, Work')).toBeOnTheScreen();
    expect(screen.queryByText('Robert Smith')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Not duplicates/ })).toHaveLength(1);
  });

  it('"Not duplicates" stores the dismissal and empties the list', async () => {
    await renderWithClient(<DuplicatesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Not duplicates/ }));

    expect(await screen.findByText('No possible duplicates')).toBeOnTheScreen();
    expect(people.tables.duplicate_dismissals).toMatchObject([
      { person_a_id: 'a', person_b_id: 'b' },
    ]);
  });

  it('"Merge" opens the merge placeholder with both ids', async () => {
    await renderWithClient(<DuplicatesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Merge/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/merge', params: { a: 'a', b: 'b' } });
  });

  it('shows an empty state when there are no duplicates', async () => {
    people.tables.persons = people.tables.persons!.filter((p) => p.id !== 'b');
    await renderWithClient(<DuplicatesScreen />);
    expect(await screen.findByText('No possible duplicates')).toBeOnTheScreen();
  });
});

describe('DuplicatesRow', () => {
  it('shows a count badge and opens the list', async () => {
    await renderWithClient(<DuplicatesRow />);
    const row = await screen.findByRole('button', { name: 'Possible duplicates: 1 to review' });
    expect(screen.getByLabelText('1')).toBeOnTheScreen();
    await fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith('/settings/duplicates');
  });

  it('shows no badge when there are none', async () => {
    people.tables.persons = [];
    await renderWithClient(<DuplicatesRow />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Possible duplicates: None found' }),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByLabelText('0')).toBeNull();
  });
});
