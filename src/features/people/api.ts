// The ONLY place the people feature talks to Supabase. See features/profile/api.ts for the pattern.
//
// Create and update are two or three plain calls (person row, then membership rows)
// rather than one SQL function: PostgREST has no multi-statement transaction, so
// `createPerson` undoes the person insert itself if the membership insert fails,
// and `updatePerson` is idempotent so a retry after a partial failure converges.
// That keeps this ticket free of a migration; move to an RPC if we ever need
// true atomicity (e.g. bulk import).
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import type { PersonFormValues } from './schemas';

export type Person = Database['public']['Tables']['persons']['Row'];
type PersonInsert = Database['public']['Tables']['persons']['Insert'];

export interface PersonWithNetworks extends Person {
  /** Networks the person is explicitly a member of (empty for the self person). */
  networkIds: string[];
}

/** Person columns the form edits; `networkIds` is handled separately. */
export type PersonFields = Omit<PersonFormValues, 'networkIds'>;

/** Map validated form values to database columns. */
export function toPersonRow(fields: PersonFields): PersonInsert {
  return {
    first_name: fields.firstName,
    last_name: fields.lastName,
    preferred_name: fields.preferredName,
    pronouns: fields.pronouns,
    birthdate: fields.birthdate,
    birthday_reminder: fields.birthdayReminder,
    anniversary_date: fields.anniversaryDate,
    anniversary_reminder: fields.anniversaryReminder,
    location_city: fields.locationCity,
    job_title: fields.jobTitle,
    company: fields.company,
    department: fields.department,
    notes: fields.notes,
    tags: fields.tags,
    fun_facts: fields.funFacts,
    conversation_starters: fields.conversationStarters,
  };
}

export async function getPerson(id: string): Promise<PersonWithNetworks | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('*, network_members(network_id)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { network_members, ...person } = data;
  return { ...person, networkIds: network_members.map((m) => m.network_id) };
}

/**
 * Create a person and add them to the given networks. If adding memberships fails,
 * the person is deleted again so nothing is left half-saved, and the original error
 * is thrown.
 */
export async function createPerson(fields: PersonFields, networkIds: string[]): Promise<Person> {
  const { data: person, error } = await supabase
    .from('persons')
    .insert(toPersonRow(fields))
    .select('*')
    .single();
  if (error) throw error;

  if (networkIds.length > 0) {
    const { error: memberError } = await supabase
      .from('network_members')
      .insert(networkIds.map((network_id) => ({ network_id, person_id: person.id })));
    if (memberError) {
      // Best-effort undo; the membership error is the one worth reporting.
      await supabase.from('persons').delete().eq('id', person.id);
      throw memberError;
    }
  }
  return person;
}

/**
 * Update a person's fields and, when `networkIds` is given, sync memberships to
 * exactly that set (adds the new ones, removes the rest). Pass `undefined` for the
 * self person, who belongs to every network implicitly.
 */
export async function updatePerson(
  id: string,
  fields: PersonFields,
  networkIds: string[] | undefined,
): Promise<Person> {
  const { data: person, error } = await supabase
    .from('persons')
    .update(toPersonRow(fields))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  if (networkIds === undefined) return person;

  const { data: current, error: readError } = await supabase
    .from('network_members')
    .select('network_id')
    .eq('person_id', id);
  if (readError) throw readError;

  const existing = new Set((current ?? []).map((m) => m.network_id));
  const wanted = new Set(networkIds);
  const toAdd = [...wanted].filter((n) => !existing.has(n));
  const toRemove = [...existing].filter((n) => !wanted.has(n));

  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from('network_members')
      .insert(toAdd.map((network_id) => ({ network_id, person_id: id })));
    if (addError) throw addError;
  }
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('network_members')
      .delete()
      .eq('person_id', id)
      .in('network_id', toRemove);
    if (removeError) throw removeError;
  }
  return person;
}
