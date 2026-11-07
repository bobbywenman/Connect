import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { dismissDuplicate, listDismissals, listPeopleForDuplicateCheck } from './api';

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

beforeEach(() => {
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
});
afterEach(() => uninstall());

describe('listPeopleForDuplicateCheck', () => {
  it('returns non-archived people with their network ids', async () => {
    people.seedPerson({ id: 'a', first_name: 'Robert', last_name: 'Wenman' }, ['n1', 'n2']);
    people.seedPerson({ id: 'b', first_name: 'Sam', archived_at: '2026-01-01T00:00:00Z' }, ['n1']);
    people.seedPerson({ id: 'me', first_name: 'Alex', is_self: true });

    const result = await listPeopleForDuplicateCheck();

    expect(result.map((p) => p.id).sort()).toEqual(['a', 'me']);
    expect(result.find((p) => p.id === 'a')).toMatchObject({
      first_name: 'Robert',
      networkIds: ['n1', 'n2'],
    });
    expect(result.find((p) => p.id === 'me')).toMatchObject({ is_self: true, networkIds: [] });
  });
});

describe('dismissDuplicate', () => {
  it('stores the pair ordered, whichever way round it is given', async () => {
    await dismissDuplicate('b', 'a');
    expect(people.tables.duplicate_dismissals).toMatchObject([
      { person_a_id: 'a', person_b_id: 'b' },
    ]);
  });

  it('treats (a,b) and (b,a) as the same decision and does not fail on repeats', async () => {
    await dismissDuplicate('a', 'b');
    await expect(dismissDuplicate('b', 'a')).resolves.toBeUndefined();
    await expect(dismissDuplicate('a', 'b')).resolves.toBeUndefined();
    expect(people.tables.duplicate_dismissals).toHaveLength(1);
    expect(await listDismissals()).toEqual([
      expect.objectContaining({ person_a_id: 'a', person_b_id: 'b' }),
    ]);
  });

  it('throws other database errors', async () => {
    people.failOn(
      'duplicate_dismissals',
      'insert',
      Object.assign(new Error('boom'), { code: 'X' }),
    );
    await expect(dismissDuplicate('a', 'b')).rejects.toThrow('boom');
  });
});
