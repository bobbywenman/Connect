import { CHUNK_SIZE, createChunkedStorage, type AsyncKeyValueStorage } from './secureStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

/** In-memory backend that enforces SecureStore's ~2KB value limit. */
function makeBackend() {
  const data = new Map<string, string>();
  const backend: AsyncKeyValueStorage = {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      if (Buffer.byteLength(value) > 2048) throw new Error('Value too large');
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
  return { data, backend };
}

describe('createChunkedStorage', () => {
  it('returns null for a missing key', async () => {
    const { backend } = makeBackend();
    expect(await createChunkedStorage(backend).getItem('nope')).toBeNull();
  });

  it('stores a small value in a single chunk', async () => {
    const { backend, data } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'hello');
    expect(await storage.getItem('k')).toBe('hello');
    expect([...data.keys()].sort()).toEqual(['k.0', 'k.count']);
    expect(data.get('k.count')).toBe('1');
  });

  it('round-trips an empty string', async () => {
    const { backend } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', '');
    expect(await storage.getItem('k')).toBe('');
  });

  it('splits a large value into chunks under the size limit and reassembles it', async () => {
    const { backend, data } = makeBackend();
    const storage = createChunkedStorage(backend);
    const value = JSON.stringify({ token: 'x'.repeat(5000), name: 'Zoë 🎉'.repeat(300) });
    await storage.setItem('sb-auth', value);
    expect(await storage.getItem('sb-auth')).toBe(value);
    const expectedChunks = Math.ceil(value.length / CHUNK_SIZE);
    expect(expectedChunks).toBeGreaterThan(1);
    expect(data.get('sb-auth.count')).toBe(String(expectedChunks));
  });

  it('removes stale chunks when overwriting with a shorter value', async () => {
    const { backend, data } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'a'.repeat(CHUNK_SIZE * 4));
    expect(data.get('k.count')).toBe('4');
    await storage.setItem('k', 'short');
    expect(await storage.getItem('k')).toBe('short');
    expect([...data.keys()].sort()).toEqual(['k.0', 'k.count']);
  });

  it('grows when overwriting with a longer value', async () => {
    const { backend } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'short');
    const long = 'b'.repeat(CHUNK_SIZE * 2 + 1);
    await storage.setItem('k', long);
    expect(await storage.getItem('k')).toBe(long);
  });

  it('removes every chunk and the count key', async () => {
    const { backend, data } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'c'.repeat(CHUNK_SIZE * 3));
    await storage.removeItem('k');
    expect(data.size).toBe(0);
    expect(await storage.getItem('k')).toBeNull();
  });

  it('removing a missing key is a no-op', async () => {
    const { backend, data } = makeBackend();
    await createChunkedStorage(backend).removeItem('ghost');
    expect(data.size).toBe(0);
  });

  it('treats a missing chunk (torn write) as no value', async () => {
    const { backend, data } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'd'.repeat(CHUNK_SIZE * 2));
    data.delete('k.1');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('keeps different keys independent', async () => {
    const { backend } = makeBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('a', '1'.repeat(CHUNK_SIZE + 5));
    await storage.setItem('b', '2');
    await storage.removeItem('a');
    expect(await storage.getItem('b')).toBe('2');
  });
});
