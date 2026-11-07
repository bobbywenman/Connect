import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { usePhotoUrls } from '@/features/people/photoHooks';
import { useSession } from '@/store/session';
import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { RelationshipFlow, type RelationshipFlowProps } from './RelationshipFlow';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
  Stack: { Screen: () => null },
}));
jest.mock('@/features/people/photoHooks');

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

function seed() {
  fakeSupabase.setNetworks([
    { id: 'fam', name: 'Family', color: 'green' },
    { id: 'work', name: 'Work', color: 'blue' },
  ]);
  people.seedNetwork({ id: 'fam', name: 'Family', color: 'green' });
  people.seedNetwork({ id: 'work', name: 'Work', color: 'blue' });
  people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true });
  people.seedPerson({ id: 'sarah', first_name: 'Sarah', last_name: 'Lee' }, ['fam']);
  people.seedPerson({ id: 'maria', first_name: 'Maria', last_name: 'Diaz' }, ['fam']);
  people.seedPerson({ id: 'grace', first_name: 'Grace', last_name: 'Hall' }, ['work']);
  people.seedPerson({ id: 'old', first_name: 'Olga', archived_at: '2026-01-01' }, ['fam']);
}

async function renderFlow(props: Partial<RelationshipFlowProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <RelationshipFlow personId="sarah" {...props} />
    </QueryClientProvider>,
  );
  return client;
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  fakeSupabase.reset();
  jest.clearAllMocks();
  mockCanGoBack = true;
  useSession.setState({ userId: fakeSupabase.DEMO_USER_ID });
  jest
    .mocked(usePhotoUrls)
    .mockReturnValue({ data: {} } as unknown as ReturnType<typeof usePhotoUrls>);
  people = createFakePeople();
  uninstall = people.install();
  seed();
});
afterEach(() => {
  uninstall();
  useSession.setState({ userId: null });
});

describe('step 1: pick the other person', () => {
  it('lists You first, then shared-network people, then everyone else; no archived, no self-link', async () => {
    await renderFlow();

    expect(await screen.findByText('Who is Sarah connected to?')).toBeOnTheScreen();
    expect(screen.getByText('Step 1 of 3 · Person')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Alex, You' })).toBeOnTheScreen();
    expect(screen.getByText("In Sarah's networks")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Maria Diaz, Family' })).toBeOnTheScreen();
    expect(screen.getByText('Everyone else')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Grace Hall, Work' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Olga/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Sarah/ })).toBeNull();
  });

  it('searches by name', async () => {
    await renderFlow();
    await screen.findByText('Who is Sarah connected to?');

    await fireEvent.changeText(screen.getByTestId('relationship-person-search'), 'gra');

    expect(screen.getByRole('button', { name: 'Grace Hall, Work' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Maria/ })).toBeNull();
  });

  it('cancels from step 1', async () => {
    await renderFlow();
    await screen.findByText('Who is Sarah connected to?');

    await press('Cancel');

    expect(mockBack).toHaveBeenCalled();
  });
});

describe('step 2: pick the type', () => {
  async function toStep2() {
    await renderFlow();
    await screen.findByText('Who is Sarah connected to?');
    await press(/^Maria Diaz/);
  }

  it("phrases the options from Sarah's side, by category", async () => {
    await renderFlow();
    await screen.findByText('Who is Sarah connected to?');
    await press(/^Maria Diaz/);

    expect(await screen.findByText("Sarah is Maria's…")).toBeOnTheScreen();
    expect(screen.getByText('Step 2 of 3 · Type')).toBeOnTheScreen();
    for (const heading of ['Family', 'Professional', 'Social', 'Other']) {
      expect(screen.getByRole('header', { name: heading })).toBeOnTheScreen();
    }
    for (const label of ['Parent', 'Child', 'Cousin', 'Mentor', 'Friend', 'Neighbor']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
  });

  it('goes back to step 1 and forward again', async () => {
    await toStep2();
    await screen.findByText("Sarah is Maria's…");

    await press('Back');
    expect(await screen.findByText('Who is Sarah connected to?')).toBeOnTheScreen();
  });

  it('skips step 1 when the other person is given, and Cancel closes', async () => {
    await renderFlow({ targetId: 'maria' });

    expect(await screen.findByText("Sarah is Maria's…")).toBeOnTheScreen();
    expect(screen.getByText('Step 2 of 3 · Type')).toBeOnTheScreen();
    await press('Cancel');
    expect(mockBack).toHaveBeenCalled();
  });

  it('offers saved custom labels, both ways round, and fills the fields', async () => {
    fakeSupabase.setCustomRelationshipTypes([{ label: 'Landlord', inverse_label: 'Tenant' }]);
    await toStep2();
    await screen.findByText("Sarah is Maria's…");

    await press('Tenant');

    expect(screen.getByDisplayValue('Tenant')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Landlord')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Landlord' })).toBeOnTheScreen();
  });

  it('needs a custom label before it continues', async () => {
    await toStep2();
    await screen.findByText("Sarah is Maria's…");

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Custom label'), 'x'.repeat(51));
    expect(screen.getByText('Use 50 characters or fewer.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('step 3: review and save', () => {
  it('shows both sides, saves, and closes', async () => {
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");

    await press('Cousin');

    expect(await screen.findByText("Sarah is Maria's cousin")).toBeOnTheScreen();
    expect(screen.getByText("Maria is Sarah's cousin")).toBeOnTheScreen();
    expect(screen.getByText('Step 3 of 3 · Review')).toBeOnTheScreen();

    await press('Save');

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.relationships).toHaveLength(1);
    expect(people.tables.relationships![0]).toMatchObject({
      source_person_id: 'sarah',
      target_person_id: 'maria',
      type: 'cousin',
      inverse_type: 'cousin',
    });
  });

  it('shows the inverse wording for asymmetric types', async () => {
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");

    await press('Parent');

    expect(await screen.findByText("Sarah is Maria's parent")).toBeOnTheScreen();
    expect(screen.getByText("Maria is Sarah's child")).toBeOnTheScreen();
  });

  it('goes back from review to the type step with the choice kept', async () => {
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");
    await press('Parent');
    await screen.findByText("Sarah is Maria's parent");

    await press('Back');

    expect(await screen.findByText("Sarah is Maria's…")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Parent' })).toBeSelected();
  });

  it('saves a custom label with a different inverse, and remembers it', async () => {
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");

    await fireEvent.changeText(screen.getByLabelText('Custom label'), 'Landlord');
    await fireEvent.changeText(screen.getByLabelText("and Maria is Sarah's…"), 'Tenant');
    await press('Continue');

    expect(await screen.findByText("Sarah is Maria's landlord")).toBeOnTheScreen();
    expect(screen.getByText("Maria is Sarah's tenant")).toBeOnTheScreen();
    await press('Save');

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.relationships![0]).toMatchObject({
      type: 'custom',
      custom_label: 'Landlord',
      inverse_custom_label: 'Tenant',
    });
    await waitFor(() =>
      expect(fakeSupabase.getCustomRelationshipTypes()).toEqual([
        expect.objectContaining({ label: 'Landlord', inverse_label: 'Tenant' }),
      ]),
    );
  });

  it('still closes when remembering the custom label fails', async () => {
    fakeSupabase.setCustomRelationshipTypesError(new Error('offline'));
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");

    await fireEvent.changeText(screen.getByLabelText('Custom label'), 'Landlord');
    await press('Continue');
    await screen.findByText("Sarah is Maria's landlord");
    await press('Save');

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.relationships).toHaveLength(1);
  });

  it('blocks a duplicate with a clear message and no save', async () => {
    people.seedRelationship({
      id: 'r1',
      source_person_id: 'maria',
      target_person_id: 'sarah',
      type: 'cousin',
      inverse_type: 'cousin',
    });
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");

    await press('Cousin');

    expect(await screen.findByText("Sarah is already Maria's cousin.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(people.tables.relationships).toHaveLength(1);
  });

  it('shows a save failure and lets the person retry', async () => {
    people.failOn('relationships', 'insert', new Error('offline'));
    await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");
    await press('Friend');
    await screen.findByText("Sarah is Maria's friend");

    await press('Save');

    expect(await screen.findByText(/Couldn't save the relationship/)).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('connects to You', async () => {
    await renderFlow();
    await screen.findByText('Who is Sarah connected to?');
    await press('Alex, You');
    await press('Sibling');

    expect(await screen.findByText("Sarah is Alex's sibling")).toBeOnTheScreen();
    await press('Save');

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.relationships![0]).toMatchObject({ target_person_id: 'me' });
  });

  it('refreshes both people after saving', async () => {
    const client = await renderFlow({ targetId: 'maria' });
    await screen.findByText("Sarah is Maria's…");
    await press('Friend');
    await screen.findByText("Sarah is Maria's friend");
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    await press('Save');

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toContainEqual(['person']);
    expect(keys).toContainEqual(['persons']);
  });
});

describe('changing an existing relationship', () => {
  beforeEach(() => {
    people.seedRelationship({
      id: 'r1',
      source_person_id: 'maria',
      target_person_id: 'sarah',
      type: 'mentor',
      inverse_type: 'mentee',
    });
  });

  it('starts at step 2 with the current type selected, then updates in place', async () => {
    // Sarah is the viewer and the target: Sarah is Maria's mentee.
    await renderFlow({ relationshipId: 'r1' });

    expect(await screen.findByText("Sarah is Maria's…")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mentee' })).toBeSelected();

    await press('Parent');
    expect(await screen.findByText("Sarah is Maria's parent")).toBeOnTheScreen();
    await press('Save changes');

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(people.tables.relationships).toHaveLength(1);
    // Stored from Maria's side as the source: Maria is Sarah's child.
    expect(people.tables.relationships![0]).toMatchObject({
      id: 'r1',
      source_person_id: 'maria',
      target_person_id: 'sarah',
      type: 'child',
      inverse_type: 'parent',
    });
  });

  it('blocks changing into something the pair already has', async () => {
    people.seedRelationship({
      id: 'r2',
      source_person_id: 'sarah',
      target_person_id: 'maria',
      type: 'friend',
      inverse_type: 'friend',
    });
    await renderFlow({ relationshipId: 'r1' });
    await screen.findByText("Sarah is Maria's…");

    await press('Friend');

    expect(await screen.findByText("Sarah is already Maria's friend.")).toBeOnTheScreen();
  });

  it('says so when the relationship no longer exists', async () => {
    await renderFlow({ relationshipId: 'nope' });

    expect(await screen.findByText('Relationship not found')).toBeOnTheScreen();
  });
});
