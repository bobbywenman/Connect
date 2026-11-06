import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { listNetworkPeople } from './api';

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

beforeEach(() => {
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
});
afterEach(() => uninstall());

function rel(source: string, target: string, type = 'cousin') {
  people.tables.relationships!.push({
    source_person_id: source,
    target_person_id: target,
    type,
    inverse_type: type,
    custom_label: null,
    inverse_custom_label: null,
  });
}

describe('listNetworkPeople', () => {
  it('returns the self person first, then members of this network only', async () => {
    people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true });
    people.seedPerson({ id: 'a', first_name: 'Ann' }, ['n1']);
    people.seedPerson({ id: 'b', first_name: 'Bob' }, ['n1', 'n2']);
    people.seedPerson({ id: 'c', first_name: 'Cy' }, ['n2']);

    const result = await listNetworkPeople('n1');

    expect(result.people.map((p) => p.id)).toEqual(['me', 'a', 'b']);
    expect(result.selfId).toBe('me');
    // The membership join is an implementation detail, not part of a list row.
    expect(result.people[1]).not.toHaveProperty('network_members');
  });

  it('leaves out archived people', async () => {
    people.seedPerson({ id: 'a', first_name: 'Ann' }, ['n1']);
    people.seedPerson({ id: 'z', first_name: 'Zed', archived_at: '2026-01-01T00:00:00Z' }, ['n1']);

    const result = await listNetworkPeople('n1');

    expect(result.people.map((p) => p.id)).toEqual(['a']);
    expect(result.selfId).toBeUndefined();
  });

  it('includes archived members when asked', async () => {
    people.seedPerson({ id: 'a', first_name: 'Ann' }, ['n1']);
    people.seedPerson({ id: 'z', first_name: 'Zed', archived_at: '2026-01-01T00:00:00Z' }, ['n1']);

    const result = await listNetworkPeople('n1', { includeArchived: true });

    expect(result.people.map((p) => p.id)).toEqual(['a', 'z']);
  });

  it('keeps only relationships between listed people, using three queries', async () => {
    people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true });
    people.seedPerson({ id: 'a', first_name: 'Ann' }, ['n1']);
    people.seedPerson({ id: 'c', first_name: 'Cy' }, ['n2']);
    rel('me', 'a');
    rel('me', 'c');
    people.calls.length = 0;

    const result = await listNetworkPeople('n1');

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]).toMatchObject({
      source_person_id: 'me',
      target_person_id: 'a',
    });
    expect(people.calls).toHaveLength(3);
  });

  it('throws when a query fails', async () => {
    people.failOn('relationships', 'select', new Error('boom'));
    await expect(listNetworkPeople('n1')).rejects.toThrow('boom');
  });
});
