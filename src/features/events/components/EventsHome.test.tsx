import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { useNetworks } from '@/features/networks/hooks';

import type { EventSummary } from '../api';
import { useEvents } from '../hooks';
import { EventsHome } from './EventsHome';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks');
jest.mock('@/features/networks/hooks');
jest.mock('../dates', () => ({ ...jest.requireActual('../dates'), todayIso: () => '2026-11-06' }));

const mockUseEvents = jest.mocked(useEvents);
const mockUseNetworks = jest.mocked(useNetworks);

function state(overrides: Record<string, unknown>) {
  mockUseEvents.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useEvents>);
}

function event(id: string, name: string, eventDate: string, extra: Partial<EventSummary> = {}) {
  return {
    id,
    name,
    eventDate,
    location: null,
    description: null,
    networkId: null,
    attendeeCount: 0,
    ...extra,
  } satisfies EventSummary;
}

beforeEach(() => {
  mockPush.mockReset();
  mockUseNetworks.mockReturnValue({
    data: [
      {
        id: 'n1',
        name: 'Family',
        type: 'family',
        color: 'orange',
        description: null,
        personCount: 3,
      },
    ],
  } as unknown as ReturnType<typeof useNetworks>);
});

describe('EventsHome', () => {
  it('shows a skeleton while loading', async () => {
    state({ isPending: true });
    await render(<EventsHome />);
    expect(screen.getByTestId('events-loading')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ isError: true, refetch });
    await render(<EventsHome />);
    expect(screen.getByText("Couldn't load your events")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with a create CTA', async () => {
    state({ data: [] });
    await render(<EventsHome />);
    expect(screen.getByText('Plan for your next gathering')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Create event' })[0]!);
    expect(mockPush).toHaveBeenCalledWith('/event/new');
  });

  it('separates upcoming (soonest first, today included) from past (most recent first)', async () => {
    state({
      data: [
        event('old', 'Old reunion', '2025-06-01'),
        event('later', 'Wedding', '2026-12-20'),
        event('today', 'Team offsite', '2026-11-06'),
        event('recent', 'Conference', '2026-10-20'),
      ],
    });
    await render(<EventsHome />);
    const headers = screen.getAllByRole('header').map((h) => h.props.children);
    expect(headers).toEqual(['Upcoming', 'Past']);

    const names = screen
      .getAllByRole('button')
      .map((b) => b.props.accessibilityLabel as string)
      .filter((l) => l && !l.startsWith('Create'))
      .map((l) => l.split(',')[0]);
    expect(names).toEqual(['Team offsite', 'Wedding', 'Conference', 'Old reunion']);
  });

  it('shows date, relative phrase, location, people and the network dot on a card', async () => {
    state({
      data: [
        event('t', 'Thanksgiving', '2026-11-26', {
          location: 'Bend, OR',
          attendeeCount: 6,
          networkId: 'n1',
        }),
      ],
    });
    await render(<EventsHome />);
    const card = screen.getByRole('button', { name: /^Thanksgiving/ });
    expect(within(card).getByText('Thanksgiving')).toBeOnTheScreen();
    expect(within(card).getByText(/Thu, Nov 26/)).toBeOnTheScreen();
    expect(within(card).getByText(/in 2 weeks/)).toBeOnTheScreen();
    expect(within(card).getByText('Bend, OR')).toBeOnTheScreen();
    expect(within(card).getByText('6 people')).toBeOnTheScreen();
    expect(within(card).getByText('Family')).toBeOnTheScreen();
    expect(within(card).getByTestId('event-network-dot')).toBeOnTheScreen();
  });

  it('hints at planning when everything is in the past, and omits the dot without a network', async () => {
    state({ data: [event('p', 'Last year', '2025-01-01')] });
    await render(<EventsHome />);
    expect(screen.getByText(/Nothing coming up/)).toBeOnTheScreen();
    expect(screen.queryByTestId('event-network-dot')).toBeNull();
    expect(screen.getByText('No one added yet')).toBeOnTheScreen();
  });

  it('opens an event and the create form', async () => {
    state({ data: [event('e1', 'Wedding', '2026-12-20')] });
    await render(<EventsHome />);
    await fireEvent.press(screen.getByRole('button', { name: /^Wedding/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/event/[id]', params: { id: 'e1' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Create event' }));
    expect(mockPush).toHaveBeenCalledWith('/event/new');
  });

  it('refetches on pull to refresh', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ data: [event('e1', 'Wedding', '2026-12-20')], refetch });
    await render(<EventsHome />);
    await act(async () => {
      await screen.getByTestId('events-list').props.refreshControl.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
