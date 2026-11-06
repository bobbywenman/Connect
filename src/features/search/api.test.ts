import { supabase } from '@/lib/supabase';

import { matchHint, normalizeQuery, parseNetworks, searchPeople } from './api';

const rpc = supabase.rpc as unknown as jest.Mock;

const row = {
  id: 'p1',
  first_name: 'Robert',
  last_name: 'Wenman',
  preferred_name: 'Bob',
  photo_path: 'u/p1.jpg',
  updated_at: '2026-11-01T10:00:00Z',
  is_self: false,
  job_title: null,
  tags: ['climbing'],
  match_field: 'tag',
  match_snippet: 'climbing',
  networks: [
    { id: 'n1', name: 'Family', color: 'blue' },
    { id: 'n2', name: 'Climbing club', color: null },
  ],
  rank: 55,
};

beforeEach(() => rpc.mockReset());

describe('searchPeople', () => {
  it('calls search_people with the trimmed query and maps rows to camelCase', async () => {
    rpc.mockResolvedValueOnce({ data: [row], error: null });
    const results = await searchPeople('  wen   man ');
    expect(rpc).toHaveBeenCalledWith('search_people', { q: 'wen man', max_results: 30 });
    expect(results).toEqual([
      {
        id: 'p1',
        firstName: 'Robert',
        lastName: 'Wenman',
        preferredName: 'Bob',
        photoPath: 'u/p1.jpg',
        updatedAt: '2026-11-01T10:00:00Z',
        isSelf: false,
        jobTitle: null,
        tags: ['climbing'],
        matchField: 'tag',
        matchSnippet: 'climbing',
        networks: [
          { id: 'n1', name: 'Family', color: 'blue' },
          { id: 'n2', name: 'Climbing club', color: null },
        ],
        rank: 55,
      },
    ]);
  });

  it('turns SQL nulls into null and unknown match fields into "name"', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          ...row,
          last_name: null,
          preferred_name: null,
          photo_path: null,
          tags: null,
          networks: null,
          match_field: 'mystery',
          match_snippet: null,
        },
      ],
      error: null,
    });
    const [first] = await searchPeople('ro');
    expect(first).toMatchObject({
      lastName: null,
      preferredName: null,
      photoPath: null,
      tags: [],
      networks: [],
      matchField: 'name',
      matchSnippet: null,
    });
  });

  it('does not call the server for queries under 2 characters', async () => {
    await expect(searchPeople(' a ')).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('throws server errors and treats null data as no results', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    await expect(searchPeople('wen')).rejects.toThrow('boom');
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(searchPeople('wen')).resolves.toEqual([]);
  });

  it('passes a custom limit', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await searchPeople('wen', 5);
    expect(rpc).toHaveBeenCalledWith('search_people', { q: 'wen', max_results: 5 });
  });
});

describe('helpers', () => {
  it('normalizeQuery trims and collapses whitespace', () => {
    expect(normalizeQuery('  a \t b  ')).toBe('a b');
  });

  it('parseNetworks keeps only well-formed entries', () => {
    expect(parseNetworks('nope')).toEqual([]);
    expect(
      parseNetworks([{ id: 'a', name: 'A', color: 3 }, { id: 1, name: 'B' }, null, 'x']),
    ).toEqual([{ id: 'a', name: 'A', color: null }]);
  });

  it('matchHint names the matched field', () => {
    expect(matchHint({ matchField: 'tag', matchSnippet: 'climbing' })).toBe('Tag: climbing');
    expect(matchHint({ matchField: 'job_title', matchSnippet: 'Designer' })).toBe('Job: Designer');
    expect(matchHint({ matchField: 'notes', matchSnippet: '…loves\n sailing…' })).toBe(
      'Notes: …loves sailing…',
    );
    expect(matchHint({ matchField: 'name', matchSnippet: null })).toBeNull();
    expect(matchHint({ matchField: 'tag', matchSnippet: '  ' })).toBeNull();
  });
});
