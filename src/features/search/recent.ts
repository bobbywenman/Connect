// Recent searches: a pure list helper plus a small zustand store persisted on the device.
//
// Persistence choice: the project has no AsyncStorage, so the list is stored with the same
// chunked expo-secure-store wrapper the auth session uses (`@/lib/secureStorage`;
// localStorage on web). Searches are names of people, so keychain storage is appropriate, and
// the key includes the user id so a second account on the device never sees the first's list.
import { create } from 'zustand';

import { sessionStorage, type AsyncKeyValueStorage } from '@/lib/secureStorage';

export const MAX_RECENT_SEARCHES = 8;
const MAX_QUERY_LENGTH = 60;

const storageKey = (userId: string) => `knowthem.recentSearches.${userId}`;

/** Put `query` first, dropping any earlier copy (ignoring case), capped at 8. Blank queries are ignored. */
export function addRecentSearch(list: readonly string[], query: string): string[] {
  const clean = query.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
  if (!clean) return [...list];
  const lower = clean.toLowerCase();
  return [clean, ...list.filter((item) => item.toLowerCase() !== lower)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
}

/** Read a stored list defensively: anything that is not an array of strings is dropped. */
export function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

interface RecentSearchesState {
  userId: string | null;
  items: string[];
  /** Load the list saved for this user (call when the search screen mounts). */
  load: (userId: string) => Promise<void>;
  add: (query: string) => void;
  clear: () => void;
}

export function createRecentSearchesStore(storage: AsyncKeyValueStorage = sessionStorage) {
  const save = (userId: string | null, items: string[]) => {
    if (!userId) return;
    // Best effort: losing the history is harmless.
    const write =
      items.length > 0
        ? storage.setItem(storageKey(userId), JSON.stringify(items))
        : storage.removeItem(storageKey(userId));
    void write.catch(() => {});
  };

  return create<RecentSearchesState>()((set, get) => ({
    userId: null,
    items: [],
    load: async (userId) => {
      if (get().userId === userId) return;
      set({ userId, items: [] });
      try {
        const stored = parseRecentSearches(await storage.getItem(storageKey(userId)));
        // Keep anything searched while the read was in flight.
        if (get().userId === userId) {
          set((s) => ({ items: s.items.reduceRight((acc, q) => addRecentSearch(acc, q), stored) }));
        }
      } catch {
        // Unreadable storage: start with an empty history.
      }
    },
    add: (query) => {
      const items = addRecentSearch(get().items, query);
      set({ items });
      save(get().userId, items);
    },
    clear: () => {
      set({ items: [] });
      save(get().userId, []);
    },
  }));
}

export const useRecentSearches = createRecentSearchesStore();
