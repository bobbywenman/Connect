import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { searchPeople, type SearchResult } from './api';
import { SEARCH_DEBOUNCE_MS, useSearchPeople } from './hooks';

jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  searchPeople: jest.fn(),
}));

const mockSearch = jest.mocked(searchPeople);

function result(id: string): SearchResult {
  return {
    id,
    firstName: id,
    lastName: null,
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
  };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockSearch.mockReset();
  mockSearch.mockImplementation(async (q) => [result(q)]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSearchPeople', () => {
  it('does not search for fewer than 2 characters', async () => {
    const { result: hook } = await renderHook(() => useSearchPeople('w'), {
      wrapper: wrapper(),
    });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 5);
    });
    expect(hook.current.enabled).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('waits for the debounce before searching', async () => {
    // The first value is used as-is (the screen starts empty); debouncing applies to changes.
    const { result: hook, rerender } = await renderHook(
      (props: { q: string }) => useSearchPeople(props.q),
      { wrapper: wrapper(), initialProps: { q: '' } },
    );
    await rerender({ q: 'wen' });
    expect(hook.current.isSettling).toBe(true);
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => expect(hook.current.data).toEqual([result('wen')]));
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(hook.current.isSettling).toBe(false);
  });

  it('searches only the final query when typing fast, and trims it', async () => {
    const { result: hook, rerender } = await renderHook(
      (props: { q: string }) => useSearchPeople(props.q),
      { wrapper: wrapper(), initialProps: { q: '' } },
    );
    await rerender({ q: 'we' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    await rerender({ q: ' wen ' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(mockSearch).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await waitFor(() => expect(hook.current.data).toBeDefined());
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('wen');
  });

  it('keeps the previous results while the next query loads', async () => {
    let finish: (rows: SearchResult[]) => void = () => {};
    const { result: hook, rerender } = await renderHook(
      (props: { q: string }) => useSearchPeople(props.q),
      { wrapper: wrapper(), initialProps: { q: 'wen' } },
    );
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await waitFor(() => expect(hook.current.data).toEqual([result('wen')]));

    mockSearch.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    await rerender({ q: 'wenm' });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(hook.current.data).toEqual([result('wen')]);
    expect(hook.current.isPlaceholderData).toBe(true);

    await act(async () => finish([result('wenm')]));
    await waitFor(() => expect(hook.current.data).toEqual([result('wenm')]));
    expect(hook.current.isPlaceholderData).toBe(false);
  });
});
