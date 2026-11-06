import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useNetworks } from '@/features/networks/hooks';
import { usePhotoUrls } from '@/features/people/photoHooks';

import type { PickerPerson } from '../api';
import { useEvent, usePickerPeople, useSetEventAttendees } from '../hooks';
import { AttendeePickerScreen } from './AttendeePickerScreen';

jest.mock('../hooks');
jest.mock('@/features/networks/hooks');
jest.mock('@/features/people/photoHooks');

const person = (id: string, first: string, extra: Partial<PickerPerson> = {}): PickerPerson => ({
  id,
  first_name: first,
  last_name: null,
  preferred_name: null,
  photo_path: null,
  updated_at: '2026-01-01T00:00:00Z',
  is_self: false,
  networkIds: [],
  ...extra,
});

const PEOPLE = [
  person('p1', 'Emma', { last_name: 'Wenman', networkIds: ['fam'] }),
  person('p2', 'José', { last_name: 'García', networkIds: ['work'] }),
  person('p3', 'Linda', { last_name: 'Adams', networkIds: ['fam', 'work'] }),
  person('me', 'Robert', { last_name: 'Wenman', is_self: true }),
];
const NETWORKS = [
  { id: 'fam', name: 'Family', type: 'family', color: 'orange', description: null, personCount: 2 },
  { id: 'work', name: 'Work', type: 'work', color: 'blue', description: null, personCount: 2 },
];

const mutateAsync = jest.fn();
const onClose = jest.fn();

function setup({ attending = ['p1'], saveError = false } = {}) {
  jest.mocked(useEvent).mockReturnValue({
    data: {
      id: 'e1',
      name: 'Party',
      attendees: PEOPLE.filter((p) => attending.includes(p.id)),
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useEvent>);
  jest.mocked(usePickerPeople).mockReturnValue({
    data: PEOPLE,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof usePickerPeople>);
  jest
    .mocked(useNetworks)
    .mockReturnValue({ data: NETWORKS } as unknown as ReturnType<typeof useNetworks>);
  jest
    .mocked(usePhotoUrls)
    .mockReturnValue({ data: undefined } as unknown as ReturnType<typeof usePhotoUrls>);
  jest.mocked(useSetEventAttendees).mockReturnValue({
    mutateAsync,
    isPending: false,
    isError: saveError,
  } as unknown as ReturnType<typeof useSetEventAttendees>);
}

const row = (name: string | RegExp) => screen.getByRole('checkbox', { name });
const queryRow = (name: string | RegExp) => screen.queryByRole('checkbox', { name });

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
});

describe('AttendeePickerScreen', () => {
  it('lists everyone (You first) with the current attendees checked', async () => {
    setup();
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    const names = screen.getAllByRole('checkbox').map((r) => r.props.accessibilityLabel as string);
    expect(names[0]).toMatch(/^Robert Wenman, you/);
    expect(names).toHaveLength(4);
    expect(row(/Emma Wenman/)).toBeChecked();
    expect(row(/José García/)).not.toBeChecked();
    expect(screen.getByText('1 selected')).toBeOnTheScreen();
    expect(row(/Linda Adams/).props.accessibilityLabel).toBe('Linda Adams, in Family, Work');
  });

  it('shows a loading state and an error with retry', async () => {
    setup();
    const refetch = jest.fn();
    jest.mocked(usePickerPeople).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof usePickerPeople>);
    const { rerender } = await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();

    jest.mocked(usePickerPeople).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as unknown as ReturnType<typeof usePickerPeople>);
    await rerender(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
  });

  it('searches instantly, ignoring case and accents', async () => {
    setup();
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.changeText(screen.getByTestId('attendee-search'), 'JOSE');
    expect(row(/José García/)).toBeOnTheScreen();
    expect(queryRow(/Emma/)).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('attendee-search'), 'zzz');
    expect(screen.getByText('No matches')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('narrows by network chip and returns to All', async () => {
    setup();
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Work network filter' }));
    expect(queryRow(/Emma/)).not.toBeOnTheScreen();
    expect(row(/José/)).toBeOnTheScreen();
    expect(row(/Linda/)).toBeOnTheScreen();
    // You belong to every network.
    expect(row(/Robert/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Work network filter' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'All network filter' }));
    expect(row(/Emma/)).toBeOnTheScreen();
  });

  it('selects all in view only, keeps others, and clears', async () => {
    setup({ attending: ['p1'] });
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Work network filter' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Select all in view' }));
    expect(screen.getByText('4 selected')).toBeOnTheScreen();
    expect(row(/José/)).toBeChecked();
    expect(row(/Robert/)).toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText('None selected')).toBeOnTheScreen();
    expect(row(/José/)).not.toBeChecked();
  });

  it('toggles a person and saves exactly the selected set, then closes', async () => {
    setup({ attending: ['p1', 'p3'] });
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(row(/Emma/));
    await fireEvent.press(row(/José/));
    expect(screen.getByText('2 selected')).toBeOnTheScreen();
    expect(row(/Emma/)).not.toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect([...(mutateAsync.mock.calls[0]![0] as string[])].sort()).toEqual(['p2', 'p3']);
  });

  it('stays open and shows an error when saving fails', async () => {
    setup({ saveError: true });
    mutateAsync.mockRejectedValue(new Error('boom'));
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(row(/José/));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(row(/José/)).toBeChecked();
  });

  it('cancels straight away when nothing changed', async () => {
    setup();
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('confirms before discarding changes, and can keep editing', async () => {
    setup();
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(row(/José/));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Discard changes?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(row(/José/)).toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('treats toggling back to the original set as unchanged', async () => {
    setup();
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    await fireEvent.press(row(/José/));
    await fireEvent.press(row(/José/));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('signs the photo paths of everyone listed', async () => {
    setup();
    jest.mocked(usePickerPeople).mockReturnValue({
      data: [{ ...PEOPLE[0]!, photo_path: 'u/p1.jpg' }, ...PEOPLE.slice(1)],
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof usePickerPeople>);
    await render(<AttendeePickerScreen eventId="e1" onClose={onClose} />);
    expect(usePhotoUrls).toHaveBeenCalledWith(
      expect.arrayContaining(['u/p1.jpg']),
      '2026-01-01T00:00:00Z',
    );
  });
});
