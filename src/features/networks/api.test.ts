import { supabase } from '@/lib/supabase';

import {
  countPeopleOnlyInNetwork,
  createNetwork,
  deleteNetwork,
  getNetwork,
  listNetworks,
  updateNetwork,
} from './api';

function mockQuery(result: { data: unknown; error: Error | null }) {
  const order = jest.fn(async () => result);
  const select = jest.fn(() => ({ order }));
  (supabase.from as unknown as jest.Mock).mockReturnValueOnce({ select });
  return { select };
}

describe('listNetworks', () => {
  it('maps rows to summaries in one query', async () => {
    const { select } = mockQuery({
      data: [
        {
          id: 'n1',
          name: 'Wenman Family',
          type: 'family',
          color: 'orange',
          description: null,
          person_count: 8,
        },
        { id: 'n2', name: 'Work', type: 'work', color: null, description: 'x', person_count: null },
      ],
      error: null,
    });
    const result = await listNetworks();
    expect(supabase.from).toHaveBeenCalledWith('networks_with_counts');
    expect(select).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'n1',
        name: 'Wenman Family',
        type: 'family',
        color: 'orange',
        description: null,
        personCount: 8,
      },
      { id: 'n2', name: 'Work', type: 'work', color: null, description: 'x', personCount: 0 },
    ]);
  });

  it('throws on error', async () => {
    mockQuery({ data: null, error: new Error('boom') });
    await expect(listNetworks()).rejects.toThrow('boom');
  });
});

describe('network writes', () => {
  const row = { id: 'n1', name: 'Book Club', type: 'friends', color: 'teal', description: null };

  function mockChain(result: { data: unknown; error: Error | null }) {
    const single = jest.fn(async () => result);
    const select = jest.fn(() => ({ single }));
    const eq = jest.fn(() => ({ select, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const update = jest.fn(() => ({ eq }));
    const pick = jest.fn(() => ({ eq }));
    (supabase.from as unknown as jest.Mock).mockReturnValueOnce({
      insert,
      update,
      select: pick,
    });
    return { insert, update, eq };
  }

  it('createNetwork trims the name and nulls a blank description', async () => {
    const { insert } = mockChain({ data: row, error: null });
    await expect(
      createNetwork({ name: '  Book Club ', type: 'friends', color: 'teal', description: '  ' }),
    ).resolves.toEqual(row);
    expect(supabase.from).toHaveBeenCalledWith('networks');
    expect(insert).toHaveBeenCalledWith({
      name: 'Book Club',
      type: 'friends',
      color: 'teal',
      description: null,
    });
  });

  it('createNetwork throws on error', async () => {
    mockChain({ data: null, error: new Error('nope') });
    await expect(createNetwork({ name: 'x', type: 'work', color: 'blue' })).rejects.toThrow('nope');
  });

  it('updateNetwork sends only the patch, by id', async () => {
    const { update, eq } = mockChain({ data: row, error: null });
    await updateNetwork('n1', { name: ' Renamed ' });
    expect(update).toHaveBeenCalledWith({ name: 'Renamed' });
    expect(eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('getNetwork returns null when missing', async () => {
    mockChain({ data: null, error: null });
    await expect(getNetwork('missing')).resolves.toBeNull();
  });

  it('deleteNetwork calls the delete_network RPC and returns the people count', async () => {
    (supabase.rpc as unknown as jest.Mock).mockResolvedValueOnce({ data: 3, error: null });
    await expect(deleteNetwork('n1')).resolves.toBe(3);
    expect(supabase.rpc).toHaveBeenCalledWith('delete_network', { network_id: 'n1' });
  });

  it('countPeopleOnlyInNetwork calls its RPC; errors are thrown', async () => {
    (supabase.rpc as unknown as jest.Mock).mockResolvedValueOnce({ data: 2, error: null });
    await expect(countPeopleOnlyInNetwork('n1')).resolves.toBe(2);
    expect(supabase.rpc).toHaveBeenCalledWith('count_people_only_in_network', {
      network_id: 'n1',
    });
    (supabase.rpc as unknown as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('rpc'),
    });
    await expect(countPeopleOnlyInNetwork('n1')).rejects.toThrow('rpc');
  });
});
