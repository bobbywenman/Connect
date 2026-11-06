import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { queryKeys } from '@/lib/queryKeys';

import { MIN_QUERY_LENGTH, normalizeQuery, searchPeople } from './api';

export const SEARCH_DEBOUNCE_MS = 200;

/** `value`, but only after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Search results for what the user has typed. The query is debounced (200ms), nothing is
 * requested under 2 characters, and the previous results stay on screen while the next
 * ones load, so the list does not flash empty between keystrokes.
 *
 * `isSettling` is true while the typed text is ahead of the query being run.
 */
export function useSearchPeople(query: string) {
  const typed = normalizeQuery(query);
  const debounced = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS);
  const enabled = debounced.length >= MIN_QUERY_LENGTH;
  const result = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => searchPeople(debounced),
    enabled,
    placeholderData: keepPreviousData,
    // People can be edited elsewhere in the app; always revalidate a repeated search.
    staleTime: 0,
  });
  return { ...result, enabled, debouncedQuery: debounced, isSettling: typed !== debounced };
}
