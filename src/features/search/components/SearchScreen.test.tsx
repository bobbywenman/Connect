import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { createRecentSearchesStore } from '../recent';
import type { SearchResult } from '../api';
import { useSearchPeople } from '../hooks';
import { SearchScreen } from './SearchScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks');
jest.mock('@/features/people/photoHooks', () => ({
  usePhotoUrls: () => ({ data: { 'u/rob.jpg': 'https://example.test/rob.jpg' } }),
}));

// The real store, backed by memory so no device storage is touched.
let mockRecent: ReturnType<typeof createRecentSearchesStore>;
jest.mock('../recent', () => {
  const actual = jest.requireActual<typeof import('../recent')>('../recent');
  return {
    ...actual,
    useRecentSearches: (selector: (s: unknown) => unknown) => mockRecent(selector as never),
  };
});

const mockUseSearch = jest.mocked(useSearchPeople);

function state(overrides: Record<string, unknown> = {}) {
  mockUseSearch.mockReturnValue({
    data: undefined,
    isError: false,
    isFetching: false,
    isPlaceholderData: false,
    isSettling: false,
    enabled: true,
    debouncedQuery: '',
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useSearchPeople>);
}

function hit(id: string, first: string, extra: Partial<SearchResult> = {}): SearchResult {
  return {
    id,
    firstName: first,
    lastName: 'Wenman',
    preferredName: null,
    photoPath: null,
    updatedAt: '2026-11-01T00:00:00Z',
    isSelf: false,
    jobTitle: null,
    tags: [],
    matchField: 'name',
    matchSnippet: null,
    networks: [],
    rank: 100,
    ...extra,
  };
}

const results: SearchResult[] = [
  hit('rob', 'Robert', {
    photoPath: 'u/rob.jpg',
    networks: [
      { id: 'n1', name: 'Family', color: 'blue' },
      { id: 'n2', name: 'Climbing club', color: 'green' },
    ],
    matchField: 'tag',
    matchSnippet: 'climbing',
  }),
  hit('ann', 'Ann', { matchField: 'notes', matchSnippet: '…loves sailing…' }),
];

async function type(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Search everyone'), text);
}

beforeEach(() => {
  mockPush.mockClear();
  mockRecent = createRecentSearchesStore({
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  });
  state();
});

describe('SearchScreen', () => {
  it('autofocuses the field and explains what you can search for', async () => {
    await render(<SearchScreen />);
    expect(screen.getByLabelText('Search everyone').props.autoFocus).toBe(true);
    expect(screen.getByText('Find anyone fast')).toBeOnTheScreen();
  });

  it('shows recent searches for an empty query; tapping one reuses it', async () => {
    mockRecent.getState().add('wen');
    mockRecent.getState().add('climbing');
    await render(<SearchScreen />);
    expect(screen.getByText('Recent searches')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Search for wen' }));
    expect(screen.getByLabelText('Search everyone').props.value).toBe('wen');
  });

  it('clears all recent searches', async () => {
    mockRecent.getState().add('wen');
    await render(<SearchScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear recent searches' }));
    expect(screen.queryByText('Recent searches')).not.toBeOnTheScreen();
    expect(screen.getByText('Find anyone fast')).toBeOnTheScreen();
  });

  it('asks for a second character', async () => {
    await render(<SearchScreen />);
    await type('w');
    expect(screen.getByText('Type at least 2 characters to search.')).toBeOnTheScreen();
  });

  it('shows a skeleton while the first results load', async () => {
    state({ data: undefined, isSettling: true });
    await render(<SearchScreen />);
    await type('wen');
    expect(screen.getByTestId('search-loading')).toBeOnTheScreen();
  });

  it('shows results with networks and the matched field, and opens a person', async () => {
    state({ data: results, debouncedQuery: 'wen' });
    await render(<SearchScreen />);
    await type('wen');
    expect(screen.getByText('2 results')).toBeOnTheScreen();
    expect(screen.getByText('Family')).toBeOnTheScreen();
    expect(screen.getByText('Climbing club')).toBeOnTheScreen();
    expect(screen.getByText('Tag: climbing')).toBeOnTheScreen();
    expect(screen.getByText('Notes: …loves sailing…')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByLabelText('Robert Wenman, in Family and Climbing club. Tag: climbing'),
    );
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/person/[id]', params: { id: 'rob' } });
    // The search is remembered once it led somewhere.
    expect(mockRecent.getState().items).toEqual(['wen']);
  });

  it('keeps showing previous results (not a skeleton) while the next ones load', async () => {
    state({ data: results, isPlaceholderData: true });
    await render(<SearchScreen />);
    await type('wenm');
    expect(screen.queryByTestId('search-loading')).not.toBeOnTheScreen();
    expect(screen.getByText('Ann Wenman')).toBeOnTheScreen();
  });

  it('says when nothing matches', async () => {
    state({ data: [] });
    await render(<SearchScreen />);
    await type('zzz');
    expect(screen.getByText('No results')).toBeOnTheScreen();
    expect(screen.getByText(/Nobody matches “zzz”/)).toBeOnTheScreen();
  });

  it('does not claim "no results" while the typed text is ahead of the search', async () => {
    state({ data: [], isSettling: true });
    await render(<SearchScreen />);
    await type('zzz');
    expect(screen.queryByText('No results')).not.toBeOnTheScreen();
    expect(screen.getByTestId('search-loading')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    state({ isError: true, refetch });
    await render(<SearchScreen />);
    await type('wen');
    expect(screen.getByText("Couldn't search")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('clears the field with the clear button and remembers a submitted search', async () => {
    state({ data: results });
    await render(<SearchScreen />);
    await type('wen');
    await act(async () => {
      screen.getByLabelText('Search everyone').props.onSubmitEditing();
    });
    expect(mockRecent.getState().items).toEqual(['wen']);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByLabelText('Search everyone').props.value).toBe('');
  });
});
