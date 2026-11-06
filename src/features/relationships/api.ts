// Data-access for the signed-in user's custom relationship labels (KT-19). This file is
// the ONLY place that talks to Supabase for the feature. RLS limits rows to the caller.
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

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
