// Data-access for the signed-in user's custom relationship labels (KT-19). This file is
// the ONLY place that talks to Supabase for the feature. RLS limits rows to the caller.
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { duplicateSentence, isDuplicate, type NameLookup, type RelationshipRow } from './labels';
import type { RelationshipFields } from './flow';

export type CustomRelationshipType =
  Database['public']['Tables']['custom_relationship_types']['Row'];

/** Matches the length check on custom_relationship_types.label / inverse_label. */
export const CUSTOM_LABEL_MAX_LENGTH = 50;

export interface CustomRelationshipTypeInput {
  /** What the user is to the other person, e.g. "Landlord". */
  label: string;
  /** What the other person is to the user, e.g. "Tenant". */
  inverseLabel: string;
}

/** The signed-in user's saved custom labels, ordered by label. */
export async function listCustomRelationshipTypes(): Promise<CustomRelationshipType[]> {
  const { data, error } = await supabase
    .from('custom_relationship_types')
    .select('*')
    .order('label', { ascending: true });
  if (error) throw error;
  return data;
}

/** Trims and validates one label. Length counts characters, as Postgres char_length does. */
function cleanLabel(raw: string, field: string): string {
  const value = raw.trim();
  if (value.length === 0) {
    throw new Error(`${field} is required.`);
  }
  if (Array.from(value).length > CUSTOM_LABEL_MAX_LENGTH) {
    throw new Error(`${field} must be ${CUSTOM_LABEL_MAX_LENGTH} characters or fewer.`);
  }
  return value;
}

/**
 * Saves a custom label pair for the signed-in user. Matching is case-insensitive. If the
 * same pair already exists, nothing is inserted and the existing row is returned.
 * Throws when the label is already saved with a different inverse, because the database
 * allows only one row per label.
 */
export async function saveCustomRelationshipType(
  input: CustomRelationshipTypeInput,
): Promise<CustomRelationshipType> {
  const label = cleanLabel(input.label, 'Label');
  const inverseLabel = cleanLabel(input.inverseLabel, 'Inverse label');
  const labelKey = label.toLowerCase();
  const inverseKey = inverseLabel.toLowerCase();

  const existing = await listCustomRelationshipTypes();
  const samePair = existing.find(
    (row) => row.label.toLowerCase() === labelKey && row.inverse_label.toLowerCase() === inverseKey,
  );
  if (samePair) return samePair;

  // Saving to the label list is a convenience, so never block the user: if the
  // label is already saved with a different inverse, keep the saved entry.
  const sameLabel = existing.find((row) => row.label.toLowerCase() === labelKey);
  if (sameLabel) return sameLabel;

  const { data, error } = await supabase
    .from('custom_relationship_types')
    .insert({ label, inverse_label: inverseLabel })
    .select()
    .single();
  if (error) throw error;
  return data;
}

const RELATIONSHIP_COLUMNS =
  'id, source_person_id, target_person_id, type, inverse_type, custom_label, inverse_custom_label';

type StoredRelationship = RelationshipRow & { id: string };

const GENERIC_SAVE_ERROR = "Couldn't save the relationship. Check your connection and try again.";

/** Turns a database error into a message a person can act on. */
export function friendlyRelationshipError(error: unknown): Error {
  const code = (error as { code?: string } | null)?.code;
  if (code === '23505') {
    return new Error(
      'These two people already have this relationship. Change or remove the existing one instead.',
    );
  }
  if (code === '23514') {
    return new Error(
      'That relationship is not valid. Check the labels (up to 50 characters) and try again.',
    );
  }
  return new Error(GENERIC_SAVE_ERROR);
}

/** Relationships touching either person, narrowed to ones between exactly the two. */
async function relationshipsBetween(a: string, b: string): Promise<StoredRelationship[]> {
  const { data, error } = await supabase
    .from('relationships')
    .select(RELATIONSHIP_COLUMNS)
    .or(`source_person_id.eq.${a},target_person_id.eq.${a}`);
  if (error) throw friendlyRelationshipError(error);
  return (data as StoredRelationship[]).filter(
    (r) =>
      (r.source_person_id === a && r.target_person_id === b) ||
      (r.source_person_id === b && r.target_person_id === a),
  );
}

async function nameLookup(ids: string[]): Promise<NameLookup> {
  const { data } = await supabase
    .from('persons')
    .select('id, first_name, preferred_name')
    .in('id', ids);
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  return (id) => byId.get(id);
}

/** Throws "Sarah is already Maria's cousin." when the pair already has this relationship. */
async function assertNotDuplicate(row: RelationshipRow, ignoreId?: string): Promise<void> {
  const existing = (await relationshipsBetween(row.source_person_id, row.target_person_id)).filter(
    (r) => r.id !== ignoreId,
  );
  if (!isDuplicate(existing, row)) return;
  const names = await nameLookup([row.source_person_id, row.target_person_id]);
  throw new Error(duplicateSentence(row, row.source_person_id, names));
}

/** Inserts the output of `buildRelationship`, unless the pair already has it (either direction). */
export async function createRelationship(row: RelationshipRow): Promise<StoredRelationship> {
  await assertNotDuplicate(row);
  const { data, error } = await supabase
    .from('relationships')
    .insert(row)
    .select(RELATIONSHIP_COLUMNS)
    .single();
  if (error) throw friendlyRelationshipError(error);
  return data as StoredRelationship;
}

/**
 * Rewrites the type columns of an existing relationship in place. `row` carries the stored
 * source and target (for the duplicate check) with the new columns.
 */
export async function updateRelationship(
  id: string,
  row: RelationshipRow,
): Promise<StoredRelationship> {
  await assertNotDuplicate(row, id);
  const fields: RelationshipFields = {
    type: row.type,
    inverse_type: row.inverse_type,
    custom_label: row.custom_label,
    inverse_custom_label: row.inverse_custom_label,
  };
  const { data, error } = await supabase
    .from('relationships')
    .update(fields)
    .eq('id', id)
    .select(RELATIONSHIP_COLUMNS)
    .single();
  if (error) throw friendlyRelationshipError(error);
  return data as StoredRelationship;
}

export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await supabase.from('relationships').delete().eq('id', id);
  if (error)
    throw new Error("Couldn't remove the relationship. Check your connection and try again.");
}

/** A person the flow can connect to, with the networks that decide ordering and dots. */
export interface PickablePerson {
  id: string;
  first_name: string;
  last_name: string | null;
  preferred_name: string | null;
  photo_path: string | null;
  updated_at: string;
  is_self: boolean;
  networkIds: string[];
}

/** Every non-archived person (including You) with their network ids. */
export async function listPickablePeople(): Promise<PickablePerson[]> {
  const { data, error } = await supabase
    .from('persons')
    .select(
      'id, first_name, last_name, preferred_name, photo_path, updated_at, is_self, network_members(network_id)',
    )
    .is('archived_at', null);
  if (error) throw error;
  return data.map(({ network_members, ...person }) => ({
    ...person,
    networkIds: network_members.map((m) => m.network_id),
  }));
}
