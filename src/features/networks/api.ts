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

export interface NetworkInput {
  name: string;
  type: string;
  /** Color name from `networkColors`. */
  color: string;
  description?: string | null;
}

export type NetworkPatch = Partial<NetworkInput>;

export interface NetworkDetail {
  id: string;
  name: string;
  type: string;
  color: string | null;
  description: string | null;
}

const NETWORK_COLUMNS = 'id, name, type, color, description';

/** One network by id, or null when it does not exist (or is not yours). */
export async function getNetwork(id: string): Promise<NetworkDetail | null> {
  const { data, error } = await supabase
    .from('networks')
    .select(NETWORK_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createNetwork(input: NetworkInput): Promise<NetworkDetail> {
  const { data, error } = await supabase
    .from('networks')
    .insert({
      name: input.name.trim(),
      type: input.type,
      color: input.color,
      description: input.description?.trim() || null,
    })
    .select(NETWORK_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateNetwork(id: string, patch: NetworkPatch): Promise<NetworkDetail> {
  const values: NetworkPatch = { ...patch };
  if (values.name !== undefined) values.name = values.name.trim();
  if (values.description !== undefined && values.description !== null) {
    values.description = values.description.trim() || null;
  }
  const { data, error } = await supabase
    .from('networks')
    .update(values)
    .eq('id', id)
    .select(NETWORK_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/** Deletes the network and the people only in it (D-1). Returns how many people were deleted. */
export async function deleteNetwork(id: string): Promise<number> {
  const { data, error } = await supabase.rpc('delete_network', { network_id: id });
  if (error) throw error;
  return data ?? 0;
}

/** People that deleting this network would also delete: members in no other network, excluding you. */
export async function countPeopleOnlyInNetwork(id: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_people_only_in_network', { network_id: id });
  if (error) throw error;
  return data ?? 0;
}
