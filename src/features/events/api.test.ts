import { supabase } from '@/lib/supabase';

import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from './api';

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
