import { fireEvent, render, screen } from '@testing-library/react-native';

import type { NewThisMonthPerson } from '../api';
import { useNewThisMonth } from '../hooks';
import { usePhotoUrls } from '../photoHooks';
import { NewThisMonthSection, HOME_STRIP_LIMIT } from './NewThisMonthSection';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks');
jest.mock('../photoHooks');

const mockUseNewThisMonth = jest.mocked(useNewThisMonth);
const mockUsePhotoUrls = jest.mocked(usePhotoUrls);

function person(id: string, first: string, last: string | null = null): NewThisMonthPerson {
  return {
    id,
    first_name: first,
    last_name: last,
    preferred_name: null,
    photo_path: null,
    tags: [],
    job_title: null,
    is_self: false,
    updated_at: '2026-11-03T10:00:00Z',
    created_at: '2026-11-03T10:00:00Z',
    archived_at: null,
    networks: [],
  };
}

function state(data: NewThisMonthPerson[] | undefined) {
  mockUseNewThisMonth.mockReturnValue({ data } as unknown as ReturnType<typeof useNewThisMonth>);
}

beforeEach(() => {
  mockPush.mockClear();
  mockUsePhotoUrls.mockReturnValue({ data: {} } as unknown as ReturnType<typeof usePhotoUrls>);
});

describe('NewThisMonthSection', () => {
  it('renders nothing while loading', async () => {
    state(undefined);
    await render(<NewThisMonthSection />);
    expect(screen.queryByText(/New this month/)).toBeNull();
  });

  it('is hidden entirely when nobody was added this month', async () => {
    state([]);
    await render(<NewThisMonthSection />);
    expect(screen.queryByText(/New this month/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'See all new this month' })).toBeNull();
  });

  it('shows the header with the count, and a tappable chip per person', async () => {
    state([person('a', 'Ann', 'Adams'), person('b', 'Ben')]);
    await render(<NewThisMonthSection />);

    expect(screen.getByRole('header', { name: 'New this month · 2' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'See all new this month' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ann Adams' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]', params: { id: 'a' } });
  });

  it('shows at most eight people, but counts all of them', async () => {
    const many = Array.from({ length: HOME_STRIP_LIMIT + 2 }, (_, i) =>
      person(`p${i}`, `Person${i}`),
    );
    state(many);
    await render(<NewThisMonthSection />);

    expect(
      screen.getByRole('header', { name: `New this month · ${HOME_STRIP_LIMIT + 2}` }),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^Person\d+$/ })).toHaveLength(HOME_STRIP_LIMIT);
  });

  it('opens the see-all screen', async () => {
    state([person('a', 'Ann')]);
    await render(<NewThisMonthSection />);

    await fireEvent.press(screen.getByRole('button', { name: 'See all new this month' }));
    expect(mockPush).toHaveBeenCalledWith('/people/new-this-month');
  });
});
