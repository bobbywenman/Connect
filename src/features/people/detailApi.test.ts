import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import {
  archivePerson,
  deletePerson,
  getPersonDetail,
  removeFromNetwork,
  unarchivePerson,
} from './api';

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

beforeEach(() => {
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
  people.seedNetwork({ id: 'n1', name: 'Family', color: 'green' });
  people.seedNetwork({ id: 'n2', name: 'Book club', color: 'blue' });
  people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true });
  people.seedPerson({ id: 'rob', first_name: 'Robert', last_name: 'Wenman' }, ['n1', 'n2']);
  people.seedPerson({ id: 'mia', first_name: 'Maria', last_name: 'Wenman' }, ['n1']);
  people.seedPerson({ id: 'zed', first_name: 'Zed' }, ['n2']);
  people.seedRelationship({
    id: 'r1',
    source_person_id: 'rob',
    target_person_id: 'mia',
    type: 'cousin',
    inverse_type: 'cousin',
  });
  people.seedRelationship({
    id: 'r2',
    source_person_id: 'me',
    target_person_id: 'rob',
    type: 'child',
    inverse_type: 'parent',
  });
  people.seedRelationship({
    id: 'r3',
    source_person_id: 'zed',
    target_person_id: 'mia',
    type: 'friend',
    inverse_type: 'friend',
  });
});
afterEach(() => uninstall());

describe('getPersonDetail', () => {
  it('returns the person, their networks A-Z, and both directions of their relationships', async () => {
    const detail = await getPersonDetail('rob');

    expect(detail?.person.first_name).toBe('Robert');
    expect(detail?.networks.map((n) => n.name)).toEqual(['Book club', 'Family']);
    expect(detail?.connections.map((c) => [c.relationship.id, c.person.id]).sort()).toEqual([
      ['r1', 'mia'],
      ['r2', 'me'],
    ]);
    expect(detail?.connections.find((c) => c.person.id === 'me')?.person.is_self).toBe(true);
  });

  it('skips the other-people query when there are no relationships', async () => {
    people.seedPerson({ id: 'solo', first_name: 'Solo' });
    people.calls.length = 0;
    const detail = await getPersonDetail('solo');
    expect(detail?.connections).toEqual([]);
    expect(detail?.networks).toEqual([]);
    expect(people.calls.filter((c) => c.table === 'persons')).toHaveLength(1);
  });

  it('returns null for an unknown person', async () => {
    expect(await getPersonDetail('nope')).toBeNull();
  });

  it('throws when a query fails', async () => {
    people.failOn('relationships', 'select', new Error('boom'));
    await expect(getPersonDetail('rob')).rejects.toThrow('boom');
  });
});

describe('archivePerson / unarchivePerson', () => {
  it('sets and clears archived_at', async () => {
    await archivePerson('rob');
    expect(people.tables.persons!.find((p) => p.id === 'rob')?.archived_at).toEqual(
      expect.any(String),
    );
    await unarchivePerson('rob');
    expect(people.tables.persons!.find((p) => p.id === 'rob')?.archived_at).toBeNull();
  });

  it('refuses to archive the self person', async () => {
    await expect(archivePerson('me')).rejects.toThrow('cannot be archived');
    expect(people.tables.persons!.find((p) => p.id === 'me')?.archived_at).toBeUndefined();
  });
});

describe('deletePerson', () => {
  it('removes the person with their relationships and memberships, and nobody else', async () => {
    await deletePerson('mia');

    expect(people.tables.persons!.map((p) => p.id)).toEqual(['me', 'rob', 'zed']);
    expect(people.tables.relationships!.map((r) => r.id)).toEqual(['r2']);
    expect(people.tables.network_members!.some((m) => m.person_id === 'mia')).toBe(false);
  });

  it('does not delete the self person', async () => {
    await deletePerson('me');
    expect(people.tables.persons!.some((p) => p.id === 'me')).toBe(true);
  });

  it('throws when the database refuses', async () => {
    people.failOn('persons', 'delete', new Error('nope'));
    await expect(deletePerson('mia')).rejects.toThrow('nope');
  });
});

describe('removeFromNetwork', () => {
  it('deletes only that membership', async () => {
    await removeFromNetwork('rob', 'n1');

    const mine = people.tables.network_members!.filter((m) => m.person_id === 'rob');
    expect(mine.map((m) => m.network_id)).toEqual(['n2']);
    expect(people.tables.network_members!.some((m) => m.person_id === 'mia')).toBe(true);
    expect(people.tables.persons!.some((p) => p.id === 'rob')).toBe(true);
  });
});
