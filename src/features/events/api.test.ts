import { supabase } from '@/lib/supabase';
import { createFakePeople } from '@/test-utils/fakePeople';

import {
  createEvent,
  deleteEvent,
  getEvent,
  listAllPeopleForPicker,
  listEvents,
  setEventAttendees,
  updateEvent,
} from './api';

const from = supabase.from as unknown as jest.Mock;

const fields = {
  name: 'Thanksgiving dinner',
  eventDate: '2026-11-26',
  location: null,
  description: null,
  networkId: 'n1',
};
const dbFields = {
  name: 'Thanksgiving dinner',
  event_date: '2026-11-26',
  location: null,
  description: null,
  network_id: 'n1',
};

describe('events api', () => {
  beforeEach(() => from.mockReset());

  it('listEvents maps rows and attendee counts', async () => {
    const order = jest.fn(async () => ({
      data: [
        {
          id: 'e1',
          name: 'Wedding',
          event_date: '2026-12-20',
          location: 'Bend',
          description: null,
          network_id: null,
          event_persons: [{ count: 4 }],
        },
        {
          id: 'e2',
          name: 'Empty',
          event_date: null,
          location: null,
          description: null,
          network_id: 'n1',
          event_persons: [],
        },
      ],
      error: null,
    }));
    const select = jest.fn(() => ({ order }));
    from.mockReturnValueOnce({ select });
    const result = await listEvents();
    expect(from).toHaveBeenCalledWith('events');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('event_persons(count)'));
    expect(result).toEqual([
      {
        id: 'e1',
        name: 'Wedding',
        eventDate: '2026-12-20',
        location: 'Bend',
        description: null,
        networkId: null,
        attendeeCount: 4,
      },
      {
        id: 'e2',
        name: 'Empty',
        eventDate: null,
        location: null,
        description: null,
        networkId: 'n1',
        attendeeCount: 0,
      },
    ]);
  });

  it('listEvents throws on error', async () => {
    from.mockReturnValueOnce({
      select: () => ({ order: async () => ({ data: null, error: new Error('boom') }) }),
    });
    await expect(listEvents()).rejects.toThrow('boom');
  });

  it('getEvent returns attendees sorted by name, or null when missing', async () => {
    const row = {
      id: 'e1',
      name: 'Wedding',
      event_date: '2026-12-20',
      location: null,
      description: null,
      network_id: null,
      event_persons: [
        {
          person: {
            id: 'p2',
            first_name: 'Zoe',
            last_name: null,
            preferred_name: null,
            photo_path: null,
            updated_at: '2026-01-01T00:00:00Z',
            is_self: false,
          },
        },
        {
          person: {
            id: 'p1',
            first_name: 'Ann',
            last_name: 'Adams',
            preferred_name: null,
            photo_path: null,
            updated_at: '2026-01-01T00:00:00Z',
            is_self: false,
          },
        },
        { person: null },
      ],
    };
    const maybeSingle = jest.fn().mockResolvedValueOnce({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    from.mockReturnValueOnce({ select: () => ({ eq }) });
    const event = await getEvent('e1');
    expect(eq).toHaveBeenCalledWith('id', 'e1');
    expect(event?.attendees.map((a) => a.id)).toEqual(['p1', 'p2']);
    expect(event?.attendeeCount).toBe(2);

    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    from.mockReturnValueOnce({ select: () => ({ eq }) });
    await expect(getEvent('gone')).resolves.toBeNull();
  });

  it('createEvent inserts snake_case fields and returns the id', async () => {
    const single = jest.fn(async () => ({ data: { id: 'new' }, error: null }));
    const insert = jest.fn(() => ({ select: () => ({ single }) }));
    from.mockReturnValueOnce({ insert });
    await expect(createEvent(fields)).resolves.toEqual({ id: 'new' });
    expect(insert).toHaveBeenCalledWith(dbFields);
  });

  it('updateEvent updates by id', async () => {
    const eq = jest.fn(async () => ({ error: null }));
    const update = jest.fn(() => ({ eq }));
    from.mockReturnValueOnce({ update });
    await updateEvent('e1', fields);
    expect(update).toHaveBeenCalledWith(dbFields);
    expect(eq).toHaveBeenCalledWith('id', 'e1');
  });

  it('deleteEvent deletes by id and throws on error', async () => {
    const eq = jest.fn(async () => ({ error: null }));
    from.mockReturnValueOnce({ delete: () => ({ eq }) });
    await deleteEvent('e1');
    expect(eq).toHaveBeenCalledWith('id', 'e1');

    from.mockReturnValueOnce({
      delete: () => ({ eq: async () => ({ error: new Error('nope') }) }),
    });
    await expect(deleteEvent('e1')).rejects.toThrow('nope');
  });
});

describe('attendee api', () => {
  const fake = createFakePeople();
  let uninstall: () => void;

  const links = () =>
    fake.tables
      .event_persons!.map((r) => `${r.event_id as string}:${r.person_id as string}`)
      .sort();

  beforeEach(() => {
    fake.tables.persons = [];
    fake.tables.network_members = [];
    fake.tables.event_persons = [];
    fake.calls.length = 0;
    uninstall = fake.install();
  });
  afterEach(() => uninstall());

  it('listAllPeopleForPicker returns non-archived people with their network ids', async () => {
    fake.seedPerson({ id: 'me', first_name: 'Rob', is_self: true });
    fake.seedPerson({ id: 'a', first_name: 'Ann' }, ['n1', 'n2']);
    fake.seedPerson({ id: 'old', first_name: 'Gone', archived_at: '2026-01-01' }, ['n1']);
    const people = await listAllPeopleForPicker();
    expect(people.map((p) => p.id).sort()).toEqual(['a', 'me']);
    expect(people.find((p) => p.id === 'a')?.networkIds).toEqual(['n1', 'n2']);
    expect(people.find((p) => p.id === 'me')?.networkIds).toEqual([]);
    expect(people[0]).not.toHaveProperty('network_members');
  });

  it('listAllPeopleForPicker throws on error', async () => {
    fake.failOn('persons', 'select', new Error('boom'));
    await expect(listAllPeopleForPicker()).rejects.toThrow('boom');
  });

  it('setEventAttendees adds the new people and removes the dropped ones', async () => {
    fake.tables.event_persons!.push(
      { event_id: 'e1', person_id: 'a' },
      { event_id: 'e1', person_id: 'b' },
      { event_id: 'e2', person_id: 'z' },
    );
    await setEventAttendees('e1', ['b', 'c', 'd']);
    // Other events are untouched.
    expect(links()).toEqual(['e1:b', 'e1:c', 'e1:d', 'e2:z']);
  });

  it('setEventAttendees only writes the difference, and nothing when unchanged', async () => {
    fake.tables.event_persons!.push({ event_id: 'e1', person_id: 'a' });
    await setEventAttendees('e1', ['a']);
    expect(fake.calls.map((c) => c.op)).toEqual(['select']);

    fake.calls.length = 0;
    await setEventAttendees('e1', ['a', 'b']);
    expect(fake.calls.map((c) => c.op)).toEqual(['select', 'insert']);

    fake.calls.length = 0;
    await setEventAttendees('e1', []);
    expect(fake.calls.map((c) => c.op)).toEqual(['select', 'delete']);
    expect(links()).toEqual([]);
  });

  it('setEventAttendees converges when retried after a failed removal', async () => {
    fake.tables.event_persons!.push({ event_id: 'e1', person_id: 'a' });
    fake.failOn('event_persons', 'delete', new Error('flaky'));
    await expect(setEventAttendees('e1', ['b'])).rejects.toThrow('flaky');
    expect(links()).toEqual(['e1:a', 'e1:b']);
  });

  it('setEventAttendees throws when reading the current attendees fails', async () => {
    fake.failOn('event_persons', 'select', new Error('nope'));
    await expect(setEventAttendees('e1', ['a'])).rejects.toThrow('nope');
  });
});
