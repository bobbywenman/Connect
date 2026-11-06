import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { NetworkSummary } from '../api';
import { useNetworks } from '../hooks';
import { NetworksHome } from './NetworksHome';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks');

const mockUseNetworks = jest.mocked(useNetworks);

function state(overrides: Record<string, unknown>) {
  mockUseNetworks.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useNetworks>);
}

const networks: NetworkSummary[] = [
  {
    id: 'n1',
    name: 'Wenman Family',
    type: 'family',
    color: 'orange',
    description: null,
    personCount: 8,
  },
  { id: 'n2', name: 'Work', type: 'work', color: 'blue', description: null, personCount: 1 },
];

beforeEach(() => {
  mockPush.mockClear();
});

describe('NetworksHome', () => {
  it('shows a skeleton while loading', async () => {
    state({ isPending: true });
    await render(<NetworksHome />);
    expect(screen.getByText('Your networks')).toBeOnTheScreen();
    expect(screen.getByTestId('networks-loading')).toBeOnTheScreen();
  });

  it('lists networks and opens one on tap', async () => {
    state({ data: networks });
    await render(<NetworksHome />);
    expect(screen.getByText('Family · 8 people')).toBeOnTheScreen();
    expect(screen.getByText('Work · 1 person')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Wenman Family, Family network, 8 people' }),
    );
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/network/[id]', params: { id: 'n1' } });
  });

  it('refetches on pull to refresh', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ data: networks, refetch });
    await render(<NetworksHome />);
    const list = screen.getByTestId('networks-list');
    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with a create CTA', async () => {
    state({ data: [] });
    await render(<NetworksHome />);
    expect(screen.getByText('Create your first network')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Create network' })[0]!);
    expect(mockPush).toHaveBeenCalledWith('/network/new');
  });

  it('shows an error with Retry', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ isError: true, refetch });
    await render(<NetworksHome />);
    expect(screen.getByText("Couldn't load your networks")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('has a Create network FAB that opens /network/new', async () => {
    state({ data: networks });
    await render(<NetworksHome />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    expect(mockPush).toHaveBeenCalledWith('/network/new');
  });
});
