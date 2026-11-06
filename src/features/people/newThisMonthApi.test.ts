import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { listNewThisMonth } from './api';

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

/** Local time, so the boundary means the same thing on every machine. */
const at = (month: number, day: number, hour = 12, minute = 0, second = 0) =>
  new Date(2026, month, day, hour, minute, second).toISOString();

const NOW = new Date(2026, 10, 15, 10); // 15 Nov 2026, local

beforeEach(() => {
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
  people.seedNetwork({ id: 'family', name: 'Family', color: 'green' });
  people.seedNetwork({ id: 'work', name: 'Work', color: 'blue' });
  people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true, created_at: at(10, 2) });
});
afterEach(() => uninstall());

describe('listNewThisMonth', () => {
  it('returns only people created this local month, newest first', async () => {
    people.seedPerson({ id: 'early', first_name: 'Early', created_at: at(10, 1, 0, 0, 0) });
    people.seedPerson({ id: 'a', first_name: 'Ann', created_at: at(10, 3) }, ['family', 'work']);
    people.seedPerson({ id: 'b', first_name: 'Ben', created_at: at(10, 14) });

    const result = await listNewThisMonth(NOW);

    expect(result.map((p) => p.id)).toEqual(['b', 'a', 'early']);
  });

  it('excludes someone created on the last day of last month, and includes the first instant of this month', async () => {
    people.seedPerson({ id: 'last-day', first_name: 'Oct', created_at: at(9, 31, 23, 59, 59) });
    people.seedPerson({ id: 'first-instant', first_name: 'Nov', created_at: at(10, 1, 0, 0, 0) });

    const ids = (await listNewThisMonth(NOW)).map((p) => p.id);

    expect(ids).toEqual(['first-instant']);
  });

  it('excludes archived people and You', async () => {
    people.seedPerson({
      id: 'gone',
      first_name: 'Gone',
      created_at: at(10, 5),
      archived_at: at(10, 6),
    });
    people.seedPerson({ id: 'kept', first_name: 'Kept', created_at: at(10, 5) });

    const ids = (await listNewThisMonth(NOW)).map((p) => p.id);

    expect(ids).toEqual(['kept']);
    expect(ids).not.toContain('me');
  });

  it("embeds each person's networks A-Z with names and colors, and an empty list when in none", async () => {
    people.seedPerson({ id: 'a', first_name: 'Ann', created_at: at(10, 3) }, ['work', 'family']);
    people.seedPerson({ id: 'b', first_name: 'Ben', created_at: at(10, 4) });

    const result = await listNewThisMonth(NOW);
    const byId = Object.fromEntries(result.map((p) => [p.id, p]));

    expect(byId.a?.networks).toMatchObject([
      { id: 'family', name: 'Family', color: 'green' },
      { id: 'work', name: 'Work', color: 'blue' },
    ]);
    expect(byId.b?.networks).toEqual([]);
  });

  it('returns the fields the list needs', async () => {
    people.seedPerson({
      id: 'a',
      first_name: 'Ann',
      last_name: 'Adams',
      preferred_name: 'Annie',
      photo_path: 'owner/a.jpg',
      updated_at: at(10, 3),
      created_at: at(10, 3),
    });

    const [ann] = await listNewThisMonth(NOW);

    expect(ann).toMatchObject({
      id: 'a',
      first_name: 'Ann',
      last_name: 'Adams',
      preferred_name: 'Annie',
      photo_path: 'owner/a.jpg',
      updated_at: at(10, 3),
      created_at: at(10, 3),
      is_self: false,
    });
    expect(ann).not.toHaveProperty('network_members');
  });

  it('returns an empty list when nobody was added this month', async () => {
    people.seedPerson({ id: 'old', first_name: 'Old', created_at: at(9, 20) });

    expect(await listNewThisMonth(NOW)).toEqual([]);
  });

  it('surfaces database errors', async () => {
    people.failOn('persons', 'select', new Error('boom'));

    await expect(listNewThisMonth(NOW)).rejects.toThrow('boom');
  });
});
