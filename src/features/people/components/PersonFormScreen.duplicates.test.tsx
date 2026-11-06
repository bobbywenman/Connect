import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { orderedPair } from '../duplicates';
import { PersonFormScreen } from './PersonFormScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;
const onSaved = jest.fn();
const onCancel = jest.fn();

beforeEach(() => {
  fakeSupabase.reset();
  jest.clearAllMocks();
  fakeSupabase.setNetworks([
    { id: 'n1', name: 'Wenman Family' },
    { id: 'n2', name: 'Work' },
  ]);
  people = createFakePeople();
  uninstall = people.install();
  seed({ id: 'rob', first_name: 'Robert', last_name: 'Wenman' }, ['n1']);
});
afterEach(() => uninstall());

async function renderCreate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <QueryClientProvider client={client}>
      <PersonFormScreen mode="create" networkId="n2" onSaved={onSaved} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  await screen.findByLabelText('First name *');
}

async function fillAndSave(first: string, last: string) {
  await fireEvent.changeText(screen.getByLabelText('First name *'), first);
  await fireEvent.changeText(screen.getByLabelText('Last name'), last);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
}

/** Seeds a person with the not-null columns the edit form reads. */
const seed = (row: Record<string, unknown>, networkIds: string[] = []) =>
  people.seedPerson({ birthday_reminder: false, anniversary_reminder: false, ...row }, networkIds);

const count = () => people.tables.persons!.length;

describe('PersonFormScreen duplicate check', () => {
  it('warns before saving a person who already exists in another network', async () => {
    await renderCreate();
    await fillAndSave('Robert', 'Wenman');

    expect(await screen.findByText('Possible duplicate')).toBeOnTheScreen();
    expect(screen.getByText('Robert Wenman is already in Wenman Family.')).toBeOnTheScreen();
    expect(count()).toBe(1);
  });

  it('"Save anyway" saves the person', async () => {
    await renderCreate();
    await fillAndSave('robert', 'WENMAN');
    await fireEvent.press(await screen.findByRole('button', { name: 'Save anyway' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(count()).toBe(2);
  });

  it('"Review" opens the existing person and leaves the form unsaved', async () => {
    await renderCreate();
    await fillAndSave('Robert', 'Wenman');
    await fireEvent.press(await screen.findByRole('button', { name: 'Review' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]', params: { id: 'rob' } });
    expect(count()).toBe(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText('Possible duplicate')).toBeNull();
    expect(screen.getByLabelText('First name *').props.value).toBe('Robert');
  });

  it('"Cancel" keeps the form and saves nothing', async () => {
    await renderCreate();
    await fillAndSave('Robert', 'Wenman');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));

    expect(count()).toBe(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('saves without a prompt for the same first name with a different last name', async () => {
    await renderCreate();
    await fillAndSave('Robert', 'Smith');

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Possible duplicate')).toBeNull();
  });

  it('does not prompt for a pair that was dismissed', async () => {
    // The new person gets a fresh id each time, so dismiss against a saved twin instead.
    seed({ id: 'rob2', first_name: 'Robert', last_name: 'Wenman' }, ['n2']);
    const [a, b] = orderedPair('rob', 'rob2');
    people.tables.duplicate_dismissals!.push({ person_a_id: a, person_b_id: b });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    await render(
      <QueryClientProvider client={client}>
        <PersonFormScreen mode="edit" personId="rob2" onSaved={onSaved} onCancel={onCancel} />
      </QueryClientProvider>,
    );
    await screen.findByLabelText('First name *');
    // Rename, then rename back to the dismissed twin's name: no prompt.
    await fireEvent.changeText(screen.getByLabelText('Nickname'), 'Bobby');
    await fireEvent.changeText(screen.getByLabelText('First name *'), 'Robert ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('rob2'));
    expect(screen.queryByText('Possible duplicate')).toBeNull();
  });

  it('checks on edit when the name changed, not otherwise', async () => {
    seed({ id: 'ann', first_name: 'Ann', last_name: 'Lee' }, ['n2']);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    await render(
      <QueryClientProvider client={client}>
        <PersonFormScreen mode="edit" personId="ann" onSaved={onSaved} onCancel={onCancel} />
      </QueryClientProvider>,
    );
    await screen.findByLabelText('First name *');
    await fireEvent.changeText(screen.getByLabelText('First name *'), 'Robert');
    await fireEvent.changeText(screen.getByLabelText('Last name'), 'Wenman');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Possible duplicate')).toBeOnTheScreen();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not check an edit that leaves the name alone', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    seed({ id: 'rob3', first_name: 'Robert', last_name: 'Wenman' }, ['n2']);
    await render(
      <QueryClientProvider client={client}>
        <PersonFormScreen mode="edit" personId="rob3" onSaved={onSaved} onCancel={onCancel} />
      </QueryClientProvider>,
    );
    await screen.findByLabelText('First name *');
    await fireEvent.press(screen.getByRole('button', { name: 'Work' }));
    await fireEvent.changeText(screen.getByLabelText('Job title'), 'Nurse');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('rob3'));
    expect(screen.queryByText('Possible duplicate')).toBeNull();
  });
});
