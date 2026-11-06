import type { AsyncKeyValueStorage } from '@/lib/secureStorage';

import {
  addRecentSearch,
  createRecentSearchesStore,
  MAX_RECENT_SEARCHES,
  parseRecentSearches,
} from './recent';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: AsyncKeyValueStorage = {
    getItem: jest.fn(async (k: string) => data.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void data.set(k, v)),
    removeItem: jest.fn(async (k: string) => void data.delete(k)),
  };
  return { storage, data };
}

describe('addRecentSearch', () => {
  it('puts the newest first and drops case-insensitive duplicates', () => {
    expect(addRecentSearch(['wen', 'Climbing'], ' climbing ')).toEqual(['climbing', 'wen']);
  });

  it('keeps only the last 8', () => {
    let list: string[] = [];
    for (let i = 1; i <= 10; i++) list = addRecentSearch(list, `q${i}`);
    expect(list).toHaveLength(MAX_RECENT_SEARCHES);
    expect(list[0]).toBe('q10');
    expect(list.at(-1)).toBe('q3');
  });

  it('ignores blank queries', () => {
    expect(addRecentSearch(['a'], '   ')).toEqual(['a']);
  });
});

describe('parseRecentSearches', () => {
  it('reads a stored list and tolerates garbage', () => {
    expect(parseRecentSearches('["a","b"]')).toEqual(['a', 'b']);
    expect(parseRecentSearches('["a",3,"  "]')).toEqual(['a']);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
    expect(parseRecentSearches('not json')).toEqual([]);
    expect(parseRecentSearches(null)).toEqual([]);
  });
});

describe('recent searches store', () => {
  it('loads the saved list for the user, saves changes, and clears', async () => {
    const { storage, data } = memoryStorage({ 'knowthem.recentSearches.u1': '["wen"]' });
    const store = createRecentSearchesStore(storage);

    await store.getState().load('u1');
    expect(store.getState().items).toEqual(['wen']);

    store.getState().add('climbing');
    expect(store.getState().items).toEqual(['climbing', 'wen']);
    expect(data.get('knowthem.recentSearches.u1')).toBe('["climbing","wen"]');

    store.getState().clear();
    expect(store.getState().items).toEqual([]);
    expect(data.has('knowthem.recentSearches.u1')).toBe(false);
  });

  it('keeps each user’s list separate', async () => {
    const { storage } = memoryStorage({ 'knowthem.recentSearches.u1': '["mine"]' });
    const store = createRecentSearchesStore(storage);
    await store.getState().load('u1');
    await store.getState().load('u2');
    expect(store.getState().items).toEqual([]);
  });

  it('keeps working when storage fails', async () => {
    const { storage } = memoryStorage();
    (storage.getItem as jest.Mock).mockRejectedValue(new Error('locked'));
    (storage.setItem as jest.Mock).mockRejectedValue(new Error('locked'));
    const store = createRecentSearchesStore(storage);
    await store.getState().load('u1');
    store.getState().add('wen');
    expect(store.getState().items).toEqual(['wen']);
  });

  it('does not save without a user', () => {
    const { storage } = memoryStorage();
    const store = createRecentSearchesStore(storage);
    store.getState().add('wen');
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
