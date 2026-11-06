import { supabase } from '@/lib/supabase';

export interface NetworkSummary {
  id: string;
  name: string;
  type: string;
  /** Stored color name (see `networkColors`), e.g. "blue". */
  color: string | null;
  description: string | null;
  /** Members excluding archived people and the self person. */
  personCount: number;
}

/**
 * The signed-in user's networks with member counts, in one query. Reads the
 * `networks_with_counts` view (security invoker, so RLS applies).
 */
export async function listNetworks(): Promise<NetworkSummary[]> {
  const { data, error } = await supabase
    .from('networks_with_counts')
    .select('id, name, type, color, description, person_count')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    description: row.description,
    personCount: row.person_count ?? 0,
  }));
}
