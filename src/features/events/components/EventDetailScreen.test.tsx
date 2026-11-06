import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useNetworks } from '@/features/networks/hooks';
import { usePhotoUrls } from '@/features/people/photoHooks';

import type { EventDetail } from '../api';
import { confirmDeleteEvent } from '../confirmDelete';
import { useDeleteEvent, useEvent } from '../hooks';
import { EventDetailScreen } from './EventDetailScreen';

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
}));
jest.mock('../hooks');
jest.mock('../confirmDelete', () => ({ confirmDeleteEvent: jest.fn() }));
jest.mock('@/features/networks/hooks');
jest.mock('@/features/people/photoHooks');
jest.mock('../dates', () => ({ ...jest.requireActual('../dates'), todayIso: () => '2026-11-06' }));

const mockUseEvent = jest.mocked(useEvent);
const mockUseDelete = jest.mocked(useDeleteEvent);
const mockUseNetworks = jest.mocked(useNetworks);
const mockConfirm = jest.mocked(confirmDeleteEvent);
const mockUsePhotoUrls = jest.mocked(usePhotoUrls);

const base: EventDetail = {
  id: 'e1',
  name: 'Thanksgiving dinner',
  eventDate: '2026-11-26',
  location: 'Bend, OR',
  description: 'Bring a dish.',
  networkId: 'n1',
  attendeeCount: 0,
  attendees: [],
};

const attendee = (id: string, first: string, last: string | null = null) => ({
  id,
  first_name: first,
  last_name: last,
  preferred_name: null,
  photo_path: null,
  updated_at: '2026-01-01T00:00:00Z',
  is_self: false,
});

function state(data: EventDetail | null | undefined, overrides: Record<string, unknown> = {}) {
  mockUseEvent.mockReturnValue({
    data,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useEvent>);
}

const mutateAsync = jest.fn();

beforeEach(() => {
  mockPush.mockReset();
  mockBack.mockReset();
  mockReplace.mockReset();
  mockCanGoBack = true;
  mutateAsync.mockReset().mockResolvedValue(undefined);
  mockConfirm.mockReset();
  mockUsePhotoUrls.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof usePhotoUrls
  >);
  mockUseDelete.mockReturnValue({
    mutateAsync,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useDeleteEvent>);
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

describe('EventDetailScreen', () => {
  it('shows loading, error and not-found states', async () => {
    state(undefined, { isPending: true });
    const { rerender } = await render(<EventDetailScreen eventId="e1" />);
    expect(screen.getByText('Loading…')).toBeOnTheScreen();

    const refetch = jest.fn();
    state(undefined, { isError: true, refetch });
    await rerender(<EventDetailScreen eventId="e1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();

    state(null);
    await rerender(<EventDetailScreen eventId="e1" />);
    expect(screen.getByText('Event not found')).toBeOnTheScreen();
  });

  it('shows the event facts and the network chip', async () => {
    state(base);
    await render(<EventDetailScreen eventId="e1" />);
    expect(screen.getByText('Thanksgiving dinner')).toBeOnTheScreen();
    expect(screen.getByText(/Thu, Nov 26/)).toBeOnTheScreen();
    expect(screen.getByText(/in 2 weeks/)).toBeOnTheScreen();
    expect(screen.getByText('Bend, OR')).toBeOnTheScreen();
    expect(screen.getByText('Bring a dish.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Network: Family')).toBeOnTheScreen();
  });

  it('with no attendees: empty message, Add people opens the picker and study is disabled', async () => {
    state(base);
    await render(<EventDetailScreen eventId="e1" />);
    expect(screen.getByText('No one added yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Add people' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/event/[id]/attendees',
      params: { id: 'e1' },
    });
    mockPush.mockClear();
    const study = screen.getByRole('button', { name: 'Add people to study' });
    expect(study).toBeDisabled();
    await fireEvent.press(study);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lists attendees, opens a person, and starts studying for the event', async () => {
    state({
      ...base,
      attendeeCount: 2,
      attendees: [attendee('p1', 'Emma', 'Wenman'), attendee('p2', 'Linda')],
    });
    await render(<EventDetailScreen eventId="e1" />);
    expect(screen.getByText("Who's going (2)")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Emma Wenman' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]', params: { id: 'p1' } });

    await fireEvent.press(screen.getByRole('button', { name: 'Study for this event' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/study/session',
      params: { eventId: 'e1' },
    });
  });

  it('offers Edit attendees when people are already going, and shows their photos', async () => {
    state({
      ...base,
      attendeeCount: 1,
      attendees: [{ ...attendee('p1', 'Emma'), photo_path: 'u/p1.jpg' }],
    });
    mockUsePhotoUrls.mockReturnValue({
      data: { 'u/p1.jpg': 'https://signed.example/p1.jpg' },
    } as unknown as ReturnType<typeof usePhotoUrls>);
    await render(<EventDetailScreen eventId="e1" />);
    expect(mockUsePhotoUrls).toHaveBeenCalledWith(['u/p1.jpg']);
    expect(
      screen.getByLabelText('Photo of Emma', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Add people' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit attendees' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/event/[id]/attendees',
      params: { id: 'e1' },
    });
  });

  it('opens the edit form', async () => {
    state(base);
    await render(<EventDetailScreen eventId="e1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/event/[id]/edit', params: { id: 'e1' } });
  });

  it('does not delete when the confirmation is declined', async () => {
    state(base);
    mockConfirm.mockResolvedValue(false);
    await render(<EventDetailScreen eventId="e1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('Thanksgiving dinner'));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and goes back', async () => {
    state(base);
    mockConfirm.mockResolvedValue(true);
    await render(<EventDetailScreen eventId="e1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('goes to the Events tab after deleting when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    state(base);
    mockConfirm.mockResolvedValue(true);
    await render(<EventDetailScreen eventId="e1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/events'));
  });

  it('shows an error when the delete fails', async () => {
    state(base);
    mockConfirm.mockResolvedValue(true);
    mutateAsync.mockRejectedValue(new Error('boom'));
    mockUseDelete.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useDeleteEvent>);
    await render(<EventDetailScreen eventId="e1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });
});
