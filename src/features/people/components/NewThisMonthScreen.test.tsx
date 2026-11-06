import { fireEvent, render, screen } from '@testing-library/react-native';

import type { NewThisMonthPerson } from '../api';
import { useNewThisMonth } from '../hooks';
import { usePhotoUrls } from '../photoHooks';
import { NewThisMonthScreen } from './NewThisMonthScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks');
jest.mock('../photoHooks');

const mockUseNewThisMonth = jest.mocked(useNewThisMonth);
const mockUsePhotoUrls = jest.mocked(usePhotoUrls);

function state(overrides: Record<string, unknown>) {
  mockUseNewThisMonth.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useNewThisMonth>);
}

const created = new Date(2026, 10, 3, 12).toISOString();

const people: NewThisMonthPerson[] = [
  {
    id: 'ann',
    first_name: 'Ann',
    last_name: 'Adams',
    preferred_name: null,
    photo_path: null,
    tags: [],
    job_title: null,
    is_self: false,
    updated_at: created,
    created_at: created,
    archived_at: null,
    networks: [
      { id: 'n2', name: 'Work', color: 'blue' },
      { id: 'n1', name: 'Family', color: 'green' },
    ],
  },
  {
    id: 'ben',
    first_name: 'Ben',
    last_name: null,
    preferred_name: null,
    photo_path: null,
    tags: [],
    job_title: null,
    is_self: false,
    updated_at: created,
    created_at: created,
    archived_at: null,
    networks: [],
  },
];

beforeEach(() => {
  mockPush.mockClear();
  mockUsePhotoUrls.mockReturnValue({ data: {} } as unknown as ReturnType<typeof usePhotoUrls>);
});

describe('NewThisMonthScreen', () => {
  it('shows a loading indicator while loading', async () => {
    state({ isPending: true });
    await render(<NewThisMonthScreen />);
    expect(screen.getByLabelText('Loading new people')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ isError: true, refetch });
    await render(<NewThisMonthScreen />);
    expect(screen.getByText("Couldn't load new people")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when nobody was added this month', async () => {
    state({ data: [] });
    await render(<NewThisMonthScreen />);
    expect(screen.getByText('Nobody new this month')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Study these' })).toBeNull();
  });

  it('lists people with their networks and the date they were added', async () => {
    state({ data: people });
    await render(<NewThisMonthScreen />);

    expect(screen.getByText('Ann Adams')).toBeOnTheScreen();
    expect(screen.getByText('Work, Family · Added Nov 3')).toBeOnTheScreen();
    expect(screen.getByText('Ben')).toBeOnTheScreen();
    expect(screen.getByText('Added Nov 3')).toBeOnTheScreen();
  });

  it('opens a person from their row', async () => {
    state({ data: people });
    await render(<NewThisMonthScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Ann Adams, Work, Family · Added Nov 3' }),
    );
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]', params: { id: 'ann' } });
  });

  it('starts a study session on the recent deck from "Study these"', async () => {
    state({ data: people });
    await render(<NewThisMonthScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Study these' }));
    expect(mockPush).toHaveBeenCalledWith('/study/session?deck=recent');
  });
});
