import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** The async key/value shape Supabase auth expects for `auth.storage`. */
export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * SecureStore rejects values over ~2048 bytes, and a Supabase session is bigger.
 * 500 characters stays under the limit even at 4 bytes per character.
 */
export const CHUNK_SIZE = 500;

const chunkKey = (key: string, index: number) => `${key}.${index}`;
const countKey = (key: string) => `${key}.count`;

/**
 * Wraps a size-limited backend so any value can be stored: it is split across
 * `key.0 .. key.n-1` with the number of chunks in `key.count`.
 */
export function createChunkedStorage(backend: AsyncKeyValueStorage): AsyncKeyValueStorage {
  async function readCount(key: string): Promise<number> {
    const raw = await backend.getItem(countKey(key));
    const count = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await backend.getItem(chunkKey(key, i));
        if (part === null) return null; // torn write: treat as no session
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key, value) {
      const previousCount = await readCount(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      if (chunks.length === 0) chunks.push('');

      for (let i = 0; i < chunks.length; i++) {
        await backend.setItem(chunkKey(key, i), chunks[i] as string);
      }
      await backend.setItem(countKey(key), String(chunks.length));
      // Remove chunks left over from a longer previous value.
      for (let i = chunks.length; i < previousCount; i++) {
        await backend.removeItem(chunkKey(key, i));
      }
    },

    async removeItem(key) {
      const count = await readCount(key);
      await backend.removeItem(countKey(key));
      for (let i = 0; i < count; i++) {
        await backend.removeItem(chunkKey(key, i));
      }
    },
  };
}

const secureStoreBackend: AsyncKeyValueStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/** Web has no SecureStore; the browser's localStorage is the best available (and has no 2KB limit). */
const webBackend: AsyncKeyValueStorage = {
  async getItem(key) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

/** Session storage for Supabase auth: chunked SecureStore on native, localStorage on web. */
export const sessionStorage: AsyncKeyValueStorage =
  Platform.OS === 'web' ? webBackend : createChunkedStorage(secureStoreBackend);

/** Small per-device values (e.g. scheduled reminder IDs, D-10); same backend as the session. */
export const deviceStorage: AsyncKeyValueStorage = sessionStorage;
