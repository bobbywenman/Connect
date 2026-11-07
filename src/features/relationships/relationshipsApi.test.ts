import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import {
  createRelationship,
  deleteRelationship,
  friendlyRelationshipError,
  listPickablePeople,
  updateRelationship,
} from './api';
import { buildRelationship } from './labels';

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

function dbError(code: string) {
  return Object.assign(new Error('db'), { code });
}

beforeEach(() => {
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
  people.seedNetwork({ id: 'n1', name: 'Family', color: 'green' });
  people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true });
  people.seedPerson({ id: 'sarah', first_name: 'Sarah' }, ['n1']);
  people.seedPerson({ id: 'maria', first_name: 'Maria' }, ['n1']);
  people.seedPerson({ id: 'gone', first_name: 'Gone', archived_at: '2026-01-01' }, ['n1']);
});
afterEach(() => uninstall());

describe('createRelationship', () => {
  it('inserts the row and returns it with an id', async () => {
    const row = buildRelationship('sarah', 'maria', 'cousin');
    const created = await createRelationship(row);

    expect(created).toMatchObject({ ...row, id: expect.any(String) });
    expect(people.tables.relationships).toHaveLength(1);
  });

  it('blocks the same relationship with a clear message and inserts nothing', async () => {
    await createRelationship(buildRelationship('sarah', 'maria', 'cousin'));

    await expect(createRelationship(buildRelationship('sarah', 'maria', 'cousin'))).rejects.toThrow(
      "Sarah is already Maria's cousin.",
    );
    expect(people.tables.relationships).toHaveLength(1);
  });

  it('blocks the same relationship entered from the other side', async () => {
    await createRelationship(buildRelationship('sarah', 'maria', 'parent'));

    // "Maria is Sarah's child" is the same fact as "Sarah is Maria's parent".
    await expect(createRelationship(buildRelationship('maria', 'sarah', 'child'))).rejects.toThrow(
      "Maria is already Sarah's child.",
    );
  });

  it('allows a different relationship between the same two people', async () => {
    await createRelationship(buildRelationship('sarah', 'maria', 'cousin'));
    await createRelationship(buildRelationship('sarah', 'maria', 'friend'));

    expect(people.tables.relationships).toHaveLength(2);
  });

  it('allows connecting to You', async () => {
    await createRelationship(buildRelationship('sarah', 'me', 'friend'));

    expect(people.tables.relationships).toHaveLength(1);
  });

  it('maps a unique violation to a friendly message', async () => {
    people.failOn('relationships', 'insert', dbError('23505'));

    await expect(createRelationship(buildRelationship('sarah', 'maria', 'cousin'))).rejects.toThrow(
      /already have this relationship/,
    );
  });

  it('maps a check violation to a friendly message', async () => {
    people.failOn('relationships', 'insert', dbError('23514'));

    await expect(createRelationship(buildRelationship('sarah', 'maria', 'cousin'))).rejects.toThrow(
      /not valid/,
    );
  });

  it('hides unknown database errors behind a generic message', async () => {
    people.failOn('relationships', 'insert', new Error('connection reset by peer'));

    await expect(createRelationship(buildRelationship('sarah', 'maria', 'cousin'))).rejects.toThrow(
      "Couldn't save the relationship",
    );
  });
});

describe('friendlyRelationshipError', () => {
  it('always returns an Error', () => {
    expect(friendlyRelationshipError(null)).toBeInstanceOf(Error);
    expect(friendlyRelationshipError({ code: '23505' }).message).toMatch(/already/);
  });
});

describe('updateRelationship', () => {
  it('rewrites the type columns in place', async () => {
    const created = await createRelationship(buildRelationship('sarah', 'maria', 'friend'));

    const updated = await updateRelationship(created.id, {
      ...created,
      ...buildRelationship('sarah', 'maria', 'mentor'),
    });

    expect(updated).toMatchObject({ id: created.id, type: 'mentor', inverse_type: 'mentee' });
    expect(people.tables.relationships).toHaveLength(1);
    expect(people.tables.relationships![0]).toMatchObject({ type: 'mentor' });
  });

  it('does not count the row itself as a duplicate', async () => {
    const created = await createRelationship(buildRelationship('sarah', 'maria', 'friend'));

    await expect(updateRelationship(created.id, created)).resolves.toMatchObject({
      type: 'friend',
    });
  });

  it('blocks changing into a relationship the pair already has', async () => {
    await createRelationship(buildRelationship('sarah', 'maria', 'friend'));
    const other = await createRelationship(buildRelationship('sarah', 'maria', 'cousin'));

    await expect(
      updateRelationship(other.id, { ...other, ...buildRelationship('sarah', 'maria', 'friend') }),
    ).rejects.toThrow("Sarah is already Maria's friend.");
  });

  it('maps database errors', async () => {
    const created = await createRelationship(buildRelationship('sarah', 'maria', 'friend'));
    people.failOn('relationships', 'update', dbError('23505'));

    await expect(updateRelationship(created.id, created)).rejects.toThrow(/already have/);
  });
});

describe('deleteRelationship', () => {
  it('removes only that row', async () => {
    const a = await createRelationship(buildRelationship('sarah', 'maria', 'friend'));
    await createRelationship(buildRelationship('sarah', 'maria', 'cousin'));

    await deleteRelationship(a.id);

    expect(people.tables.relationships!.map((r) => r.type)).toEqual(['cousin']);
  });

  it('throws a friendly error on failure', async () => {
    people.failOn('relationships', 'delete', new Error('offline'));

    await expect(deleteRelationship('x')).rejects.toThrow("Couldn't remove");
  });
});

describe('listPickablePeople', () => {
  it('returns non-archived people, including You, with their network ids', async () => {
    const list = await listPickablePeople();

    expect(list.map((p) => p.id).sort()).toEqual(['maria', 'me', 'sarah']);
    expect(list.find((p) => p.id === 'sarah')?.networkIds).toEqual(['n1']);
    expect(list.find((p) => p.id === 'me')?.is_self).toBe(true);
  });
});
