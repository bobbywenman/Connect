import { supabase } from '@/lib/supabase';

/** Queries shorter than this (after trimming) are not sent. */
export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 30;

export type MatchField = 'name' | 'tag' | 'job_title' | 'notes';

export interface SearchNetwork {
  id: string;
  name: string;
  /** Stored color name (see `networkColors`), e.g. "blue". */
  color: string | null;
}

export interface SearchResult {
  id: string;
  firstName: string;
  lastName: string | null;
  preferredName: string | null;
  photoPath: string | null;
  updatedAt: string;
  isSelf: boolean;
  jobTitle: string | null;
  tags: string[];
  /** Which field produced the best match. */
  matchField: MatchField;
  /** The matching tag, job title or a piece of the notes; null for name matches. */
  matchSnippet: string | null;
  networks: SearchNetwork[];
  rank: number;
}

const MATCH_FIELDS: readonly string[] = ['name', 'tag', 'job_title', 'notes'];

/** Trim and collapse whitespace, the form the query is sent and cached in. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

/** The `networks` column is a JSON array; keep only well-formed entries. */
export function parseNetworks(value: unknown): SearchNetwork[] {
  if (!Array.isArray(value)) return [];
  const networks: SearchNetwork[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, name, color } = item as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string') continue;
    networks.push({ id, name, color: typeof color === 'string' ? color : null });
  }
  return networks;
}

/**
 * Search the signed-in user's people (names, tags, job title, notes; case and accent
 * insensitive) via the `search_people` function. Results come back best match first.
 */
export async function searchPeople(query: string, limit = MAX_RESULTS): Promise<SearchResult[]> {
  const q = normalizeQuery(query);
  if (q.length < MIN_QUERY_LENGTH) return [];
  const { data, error } = await supabase.rpc('search_people', { q, max_results: limit });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    // The generated types mark these columns non-null, but the function returns SQL nulls.
    lastName: (row.last_name as string | null) ?? null,
    preferredName: (row.preferred_name as string | null) ?? null,
    photoPath: (row.photo_path as string | null) ?? null,
    updatedAt: row.updated_at,
    isSelf: row.is_self,
    jobTitle: (row.job_title as string | null) ?? null,
    tags: row.tags ?? [],
    matchField: (MATCH_FIELDS.includes(row.match_field) ? row.match_field : 'name') as MatchField,
    matchSnippet: (row.match_snippet as string | null) ?? null,
    networks: parseNetworks(row.networks),
    rank: row.rank,
  }));
}

/** The matched-field hint under a result: "Tag: climbing", "Notes: …loves sailing…". */
export function matchHint(
  result: Pick<SearchResult, 'matchField' | 'matchSnippet'>,
): string | null {
  const snippet = result.matchSnippet?.trim();
  if (!snippet) return null;
  switch (result.matchField) {
    case 'tag':
      return `Tag: ${snippet}`;
    case 'job_title':
      return `Job: ${snippet}`;
    case 'notes':
      return `Notes: ${snippet.replace(/\s+/g, ' ')}`;
    default:
      return null;
  }
}
