import { createFakePeople } from '@/test-utils/fakePeople';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { createPerson, getPerson, toPersonRow, updatePerson, type PersonFields } from './api';
import { createPersonFormSchema, emptyPersonForm } from './schemas';

const schema = createPersonFormSchema();

function fields(overrides: Partial<typeof emptyPersonForm> = {}): PersonFields {
  const { networkIds: _ignored, ...rest } = schema.parse({
    ...emptyPersonForm,
    firstName: 'Jamie',
    networkIds: ['n1'],
    ...overrides,
  });
  return rest;
}

let people: ReturnType<typeof createFakePeople>;
let uninstall: () => void;

beforeEach(() => {
  fakeSupabase.reset();
  people = createFakePeople();
  uninstall = people.install();
});
afterEach(() => uninstall());

describe('createPerson', () => {
  it('inserts the person, then one membership row per network', async () => {
    const person = await createPerson(fields({ lastName: 'Lee' }), ['n1', 'n2']);

    expect(people.tables.persons).toHaveLength(1);
    expect(people.tables.persons![0]).toMatchObject({ first_name: 'Jamie', last_name: 'Lee' });
    expect(people.tables.network_members).toEqual([
      expect.objectContaining({ network_id: 'n1', person_id: person.id }),
      expect.objectContaining({ network_id: 'n2', person_id: person.id }),
    ]);
  });

  it('stores empty optional fields as null and tags as an array', async () => {
    await createPerson(fields({ tags: ['Golf'] }), ['n1']);
    expect(people.tables.persons![0]).toMatchObject({
      last_name: null,
      birthdate: null,
      notes: null,
      tags: ['Golf'],
      birthday_reminder: false,
    });
  });

  it('deletes the person again when the membership insert fails', async () => {
    const error = new Error('fk violation');
    people.failOn('network_members', 'insert', error);

    await expect(createPerson(fields(), ['n1'])).rejects.toBe(error);

    expect(people.tables.persons).toHaveLength(0);
  });

  it('throws the person insert error without touching memberships', async () => {
    const error = new Error('boom');
    people.failOn('persons', 'insert', error);

    await expect(createPerson(fields(), ['n1'])).rejects.toBe(error);
    expect(people.calls.some((c) => c.table === 'network_members')).toBe(false);
  });
});

describe('getPerson', () => {
  it('returns the person with its network ids', async () => {
    const id = people.seedPerson({ first_name: 'Ana' }, ['n1', 'n2']);
    const person = await getPerson(id);
    expect(person).toMatchObject({ id, first_name: 'Ana', networkIds: ['n1', 'n2'] });
    expect(person).not.toHaveProperty('network_members');
  });

  it('returns null when there is no such person', async () => {
    await expect(getPerson('missing')).resolves.toBeNull();
  });
});

describe('updatePerson', () => {
  it('updates fields and syncs memberships: adds new, removes dropped, keeps shared', async () => {
    const id = people.seedPerson({ first_name: 'Ana' }, ['n1', 'n2']);

    await updatePerson(id, fields({ firstName: 'Anna' }), ['n2', 'n3']);

    expect(people.tables.persons![0]).toMatchObject({ first_name: 'Anna' });
    const networks = people.tables.network_members!.map((m) => m.network_id).sort();
    expect(networks).toEqual(['n2', 'n3']);
  });

  it('leaves memberships alone when networkIds is undefined (self person)', async () => {
    const id = people.seedPerson({ first_name: 'Me', is_self: true });
    await updatePerson(id, fields({ firstName: 'Me too' }), undefined);
    expect(people.tables.persons![0]).toMatchObject({ first_name: 'Me too' });
    expect(people.calls.some((c) => c.table === 'network_members')).toBe(false);
  });

  it('throws when the update fails', async () => {
    const id = people.seedPerson({ first_name: 'Ana' });
    const error = new Error('denied');
    people.failOn('persons', 'update', error);
    await expect(updatePerson(id, fields(), ['n1'])).rejects.toBe(error);
  });
});

describe('toPersonRow', () => {
  it('maps every form field to its column', () => {
    const row = toPersonRow(
      fields({
        lastName: 'Lee',
        preferredName: 'J',
        pronouns: 'they/them',
        birthdate: '1990-04-23',
        birthdayReminder: true,
        anniversaryDate: '2015-06-01',
        anniversaryReminder: true,
        locationCity: 'Leeds',
        jobTitle: 'Nurse',
        company: 'NHS',
        department: 'ICU',
        notes: 'n',
        tags: ['a'],
        funFacts: 'f',
        conversationStarters: 'c',
      }),
    );
    expect(row).toEqual({
      first_name: 'Jamie',
      last_name: 'Lee',
      preferred_name: 'J',
      pronouns: 'they/them',
      birthdate: '1990-04-23',
      birthday_reminder: true,
      anniversary_date: '2015-06-01',
      anniversary_reminder: true,
      location_city: 'Leeds',
      job_title: 'Nurse',
      company: 'NHS',
      department: 'ICU',
      notes: 'n',
      tags: ['a'],
      fun_facts: 'f',
      conversation_starters: 'c',
    });
  });
});
