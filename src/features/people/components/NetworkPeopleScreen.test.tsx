import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { buildRelationship } from '@/features/relationships';

import type { NetworkPeople } from '../api';
import { useNetworkPeople } from '../hooks';
import { usePhotoUrls } from '../photoHooks';
import type { NetworkPerson } from '../listing';
import { NetworkPeopleScreen, StudyHeaderButton } from './NetworkPeopleScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks');
jest.mock('../photoHooks');

const mockUseNetworkPeople = jest.mocked(useNetworkPeople);
const mockUsePhotoUrls = jest.mocked(usePhotoUrls);

function state(overrides: Record<string, unknown>) {
  mockUseNetworkPeople.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useNetworkPeople>);
}

function p(id: string, first: string, last: string | null, extra: Partial<NetworkPerson> = {}) {
  return {
    id,
    first_name: first,
    last_name: last,
    preferred_name: null,
    photo_path: null,
    tags: [],
    job_title: null,
    is_self: false,
    ...extra,
  } satisfies NetworkPerson;
}

const data: NetworkPeople = {
  selfId: 'me',
  people: [
    p('zoe', 'Zoe', 'Young', { tags: ['Work'] }),
    p('rob', 'Robert', 'Wenman', { preferred_name: 'Bob', tags: ['Book club'] }),
    p('me', 'Alex', 'Wenman', { is_self: true }),
    p('ann', 'Ann', 'Adams', { job_title: 'Designer' }),
  ],
  relationships: [
    buildRelationship('me', 'rob', 'child'),
    buildRelationship('zoe', 'ann', 'coworker'),
  ],
};

beforeEach(() => {
  mockPush.mockClear();
  mockUsePhotoUrls.mockReturnValue({ data: {} } as unknown as ReturnType<typeof usePhotoUrls>);
});

/** Names shown in the list, in order, via each row's accessibility label. */
function rowLabels() {
  return screen
    .getAllByHintText('Opens the profile')
    .map((node) => node.props.accessibilityLabel as string);
}

describe('NetworkPeopleScreen', () => {
  it('shows a skeleton while loading', async () => {
    state({ isPending: true });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(screen.getByTestId('people-loading')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ isError: true, refetch });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(screen.getByText("Couldn't load this network")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('treats a list with only the self person as empty', async () => {
    state({
      data: { selfId: 'me', people: [p('me', 'Alex', 'W', { is_self: true })], relationships: [] },
    });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(screen.getByText('Add your first person')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add person' })[0]!);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/new', params: { networkId: 'n1' } });
  });

  it('lists people A-Z by last name with You first, with labels', async () => {
    state({ data });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(rowLabels()).toEqual([
      'Alex Wenman, You',
      'Ann Adams, Coworker of Zoe',
      'Robert Wenman (Bob), Your parent',
      'Zoe Young, Coworker of Ann',
    ]);
  });

  it('shows a job title when there is no relationship', async () => {
    state({ data: { ...data, relationships: [] } });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(screen.getByLabelText('Ann Adams, Designer')).toBeOnTheScreen();
  });

  it('filters as you type, without refetching', async () => {
    const refetch = jest.fn();
    state({ data, refetch });
    await render(<NetworkPeopleScreen networkId="n1" />);
    await fireEvent.changeText(screen.getByTestId('people-search'), 'bob');
    expect(screen.getByLabelText('Robert Wenman (Bob), Your parent')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Zoe Young/)).toBeNull();
    expect(screen.getByText('1 of 3')).toBeOnTheScreen();
    expect(refetch).not.toHaveBeenCalled();
    expect(mockUseNetworkPeople).toHaveBeenCalledWith('n1', false);
  });

  it('shows No matches, and Clear brings the list back', async () => {
    state({ data });
    await render(<NetworkPeopleScreen networkId="n1" />);
    await fireEvent.changeText(screen.getByTestId('people-search'), 'qqqq');
    expect(screen.getByText('No matches')).toBeOnTheScreen();
    const empty = screen.getByText('No matches').parent!.parent!;
    await fireEvent.press(within(empty).getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('No matches')).toBeNull();
    expect(screen.getByLabelText(/Zoe Young/)).toBeOnTheScreen();
  });

  it('opens a person on tap', async () => {
    state({ data });
    await render(<NetworkPeopleScreen networkId="n1" />);
    await fireEvent.press(screen.getByLabelText('Ann Adams, Coworker of Zoe'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/person/[id]',
      params: { id: 'ann', networkId: 'n1' },
    });
  });

  it('asks for archived people only when Show archived is on, and marks them', async () => {
    const withArchived: NetworkPeople = {
      ...data,
      people: [...data.people, p('old', 'Olga', 'Old', { archived_at: '2026-01-01T00:00:00Z' })],
    };
    state({ data });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(mockUseNetworkPeople).toHaveBeenLastCalledWith('n1', false);
    expect(screen.queryByText('Archived')).toBeNull();

    state({ data: withArchived });
    await fireEvent.press(screen.getByRole('switch', { name: 'Show archived' }));
    expect(mockUseNetworkPeople).toHaveBeenLastCalledWith('n1', true);
    expect(screen.getByText('Archived')).toBeOnTheScreen();
    expect(screen.getByLabelText('Olga Old, Archived')).toBeOnTheScreen();
    // The count in the summary and on the network ignores archived people.
    await fireEvent.press(screen.getByLabelText('Olga Old, Archived'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/person/[id]',
      params: { id: 'old', networkId: 'n1' },
    });
  });

  it('shows a row photo from the single shared photo request', async () => {
    mockUsePhotoUrls.mockReturnValue({
      data: { 'zoe.jpg': 'https://img.test/zoe.jpg' },
    } as unknown as ReturnType<typeof usePhotoUrls>);
    const withPhoto: NetworkPeople = {
      ...data,
      people: data.people.map((x) =>
        x.id === 'zoe' ? { ...x, photo_path: 'zoe.jpg', updated_at: 'v1' } : x,
      ),
    };
    state({ data: withPhoto });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(mockUsePhotoUrls).toHaveBeenCalledWith(expect.arrayContaining(['zoe.jpg']));
    expect(
      screen.getByLabelText('Photo of Zoe Young', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('pre-fills the network when adding with the FAB', async () => {
    state({ data });
    await render(<NetworkPeopleScreen networkId="n1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add person' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/new', params: { networkId: 'n1' } });
  });

  it('refetches on pull to refresh', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ data, refetch });
    await render(<NetworkPeopleScreen networkId="n1" />);
    const list = screen.getByTestId('people-list');
    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('combines tag and relationship filters from the sheet', async () => {
    state({ data });
    await render(<NetworkPeopleScreen networkId="n1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Filter' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tag Work' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tag Book club' }));
    // Tags OR: Zoe (Work) and Robert (Book club).
    expect(screen.getByText('Show 2 people')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Relationship Parent' }));
    // AND across groups: only Robert is a parent.
    expect(screen.getByText('Show 1 person')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Show 1 person' }));

    expect(screen.getByText('1 of 3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filter, 2 active' })).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Zoe Young/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText(/Zoe Young/)).toBeOnTheScreen();
    expect(screen.queryByText('1 of 3')).toBeNull();
  });

  it('renders 150 people without errors (virtualised)', async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      p(`p${i}`, `First${i}`, `Last${String(i).padStart(3, '0')}`),
    );
    state({
      data: {
        selfId: 'me',
        people: [p('me', 'Alex', 'W', { is_self: true }), ...many],
        relationships: [],
      },
    });
    await render(<NetworkPeopleScreen networkId="n1" />);
    expect(screen.getByLabelText('Alex W, You')).toBeOnTheScreen();
    expect(screen.getByLabelText('First0 Last000')).toBeOnTheScreen();
    // Far-away rows are not mounted: that is the point of FlashList.
    expect(screen.queryByLabelText('First149 Last149')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('people-search'), 'first149');
    expect(screen.getByLabelText('First149 Last149')).toBeOnTheScreen();
  });
});

describe('StudyHeaderButton', () => {
  it('opens the study session for the network', async () => {
    await render(<StudyHeaderButton networkId="n1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Study this network' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/study/session',
      params: { networkId: 'n1' },
    });
  });
});
