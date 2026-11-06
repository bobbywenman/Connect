import { supabase } from '@/lib/supabase';

import { listNetworks } from './api';

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
