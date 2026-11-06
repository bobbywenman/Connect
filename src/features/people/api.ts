// The ONLY place the people feature talks to Supabase. See features/profile/api.ts for the pattern.
//
// Create and update are two or three plain calls (person row, then membership rows)
// rather than one SQL function: PostgREST has no multi-statement transaction, so
// `createPerson` undoes the person insert itself if the membership insert fails,
// and `updatePerson` is idempotent so a retry after a partial failure converges.
// That keeps this ticket free of a migration; move to an RPC if we ever need
// true atomicity (e.g. bulk import).
import type { RelationshipRow } from '@/features/relationships';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { orderedPair, type Dismissal, type DuplicatePerson } from './duplicates';
import type { NetworkPerson } from './listing';
import { startOfMonth } from './newThisMonth';
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

/** The signed-in user's self person ("You", D-2), or null if the signup trigger has not run yet. */
export async function getSelfPerson(userId: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_self', true)
    .maybeSingle();
  if (error) throw error;
  return data;
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

const LIST_COLUMNS =
  'id, first_name, last_name, preferred_name, photo_path, tags, job_title, is_self, updated_at, archived_at';

export interface NetworkPeople {
  /** Self person first, then members; otherwise unsorted (see `sortPeople`). Archived people excluded unless `includeArchived`. */
  people: NetworkPerson[];
  /** Relationships whose two ends are both in `people`. */
  relationships: RelationshipRow[];
  /** The self person's id, when there is one. */
  selfId: string | undefined;
}

/**
 * Everything the people list needs, in three parallel queries (no N+1): the network's
 * non-archived members, the self person (who belongs to every network without a
 * membership row, D-2), and the user's relationships (RLS limits all three to the
 * caller), which are then narrowed to pairs inside the list so each row can name its label.
 */
export async function listNetworkPeople(
  networkId: string,
  options: { includeArchived?: boolean } = {},
): Promise<NetworkPeople> {
  let membersQuery = supabase
    .from('persons')
    .select(`${LIST_COLUMNS}, network_members!inner(network_id)`)
    .eq('network_members.network_id', networkId);
  if (!options.includeArchived) membersQuery = membersQuery.is('archived_at', null);
  const [members, self, relationships] = await Promise.all([
    membersQuery,
    supabase.from('persons').select(LIST_COLUMNS).eq('is_self', true).is('archived_at', null),
    supabase
      .from('relationships')
      .select(
        'source_person_id, target_person_id, type, inverse_type, custom_label, inverse_custom_label',
      ),
  ]);
  if (members.error) throw members.error;
  if (self.error) throw self.error;
  if (relationships.error) throw relationships.error;

  const selfPerson = self.data[0];
  const people: NetworkPerson[] = [
    ...(selfPerson ? [selfPerson] : []),
    ...members.data.map(({ network_members: _memberships, ...person }) => person),
  ];
  const ids = new Set(people.map((p) => p.id));
  return {
    people,
    selfId: selfPerson?.id,
    relationships: relationships.data.filter(
      (r) => ids.has(r.source_person_id) && ids.has(r.target_person_id),
    ) as RelationshipRow[],
  };
}

export interface DetailNetwork {
  id: string;
  name: string;
  color: string | null;
}

/** The other end of a connection: just what a row needs. */
export type ConnectionPerson = Pick<
  Person,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'preferred_name'
  | 'photo_path'
  | 'updated_at'
  | 'is_self'
  | 'archived_at'
  | 'job_title'
  | 'tags'
>;

export interface PersonConnection {
  relationship: RelationshipRow & { id: string };
  person: ConnectionPerson;
}

export interface PersonDetail {
  person: Person;
  /** Networks the person belongs to, A-Z (empty for the self person, who is in all of them). */
  networks: DetailNetwork[];
  connections: PersonConnection[];
}

const CONNECTION_COLUMNS =
  'id, first_name, last_name, preferred_name, photo_path, updated_at, is_self, archived_at, job_title, tags';

/**
 * Everything the detail screen shows, in two rounds: the person, their networks and their
 * relationships in parallel, then the people at the other end of those relationships in one
 * `in (...)` query. Returns null when the person does not exist (or is not the caller's).
 */
export async function getPersonDetail(id: string): Promise<PersonDetail | null> {
  const [person, memberships, relationships] = await Promise.all([
    supabase.from('persons').select('*').eq('id', id).maybeSingle(),
    supabase.from('network_members').select('networks(id, name, color)').eq('person_id', id),
    supabase
      .from('relationships')
      .select(
        'id, source_person_id, target_person_id, type, inverse_type, custom_label, inverse_custom_label',
      )
      .or(`source_person_id.eq.${id},target_person_id.eq.${id}`),
  ]);
  if (person.error) throw person.error;
  if (memberships.error) throw memberships.error;
  if (relationships.error) throw relationships.error;
  if (!person.data) return null;

  const rows = relationships.data as (RelationshipRow & { id: string })[];
  const otherOf = (r: RelationshipRow) =>
    r.source_person_id === id ? r.target_person_id : r.source_person_id;
  const otherIds = [...new Set(rows.map(otherOf))];
  let others: ConnectionPerson[] = [];
  if (otherIds.length > 0) {
    const { data, error } = await supabase
      .from('persons')
      .select(CONNECTION_COLUMNS)
      .in('id', otherIds);
    if (error) throw error;
    others = data;
  }
  const byId = new Map(others.map((p) => [p.id, p]));

  const networks = memberships.data
    .map((m) => m.networks)
    .filter((n): n is DetailNetwork => !!n)
    .sort((a, b) => a.name.localeCompare(b.name));
  const connections = rows.flatMap((relationship) => {
    const other = byId.get(otherOf(relationship));
    return other ? [{ relationship, person: other }] : [];
  });
  return { person: person.data, networks, connections };
}

/** Hide a person from lists and study decks. The self person cannot be archived (D-2). */
export interface NewThisMonthNetwork {
  id: string;
  name: string;
  color: string | null;
}

/** A person added since the start of this month, with the networks they are in (A-Z). */
export type NewThisMonthPerson = NetworkPerson & {
  created_at: string;
  networks: NewThisMonthNetwork[];
};

const NEW_THIS_MONTH_COLUMNS =
  'id, first_name, last_name, preferred_name, photo_path, tags, job_title, is_self, updated_at, created_at, archived_at, network_members(networks(id, name, color))';

/**
 * Non-archived people, excluding You, created on or after the first day of `now`'s month
 * (local time), newest first. One query: the networks come embedded through network_members.
 */
export async function listNewThisMonth(now: Date = new Date()): Promise<NewThisMonthPerson[]> {
  const { data, error } = await supabase
    .from('persons')
    .select(NEW_THIS_MONTH_COLUMNS)
    .eq('is_self', false)
    .is('archived_at', null)
    .gte('created_at', startOfMonth(now).toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;

  return data.map(({ network_members, ...person }) => ({
    ...person,
    networks: network_members
      .map((m) => m.networks)
      .filter((n): n is NewThisMonthNetwork => n !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function archivePerson(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('persons')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_self', false)
    .select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('This person cannot be archived.');
}

export async function unarchivePerson(id: string): Promise<void> {
  const { error } = await supabase.from('persons').update({ archived_at: null }).eq('id', id);
  if (error) throw error;
}

/**
 * Permanently delete a person. Their relationships and network memberships go with them
 * (on delete cascade). The self person cannot be deleted (D-2): the filter and RLS both
 * refuse, and deleting someone who is already gone is not an error.
 */
export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('persons').delete().eq('id', id).eq('is_self', false);
  if (error) throw error;
}

/** Remove one network membership; the person stays in their other networks. */
export async function removeFromNetwork(personId: string, networkId: string): Promise<void> {
  const { error } = await supabase
    .from('network_members')
    .delete()
    .eq('person_id', personId)
    .eq('network_id', networkId);
  if (error) throw error;
}

/**
 * Every non-archived person with their network ids, for duplicate detection (KT-33).
 * One query; RLS limits it to the caller's people.
 */
export async function listPeopleForDuplicateCheck(): Promise<DuplicatePerson[]> {
  const { data, error } = await supabase
    .from('persons')
    .select('id, first_name, last_name, preferred_name, is_self, network_members(network_id)')
    .is('archived_at', null);
  if (error) throw error;
  return data.map(({ network_members, ...person }) => ({
    ...person,
    networkIds: network_members.map((m) => m.network_id),
  }));
}

export async function listDismissals(): Promise<Dismissal[]> {
  const { data, error } = await supabase
    .from('duplicate_dismissals')
    .select('person_a_id, person_b_id');
  if (error) throw error;
  return data;
}

/**
 * Record "these two are not the same person". The table stores each pair once with
 * `person_a_id < person_b_id`, so (a, b) and (b, a) are the same decision; dismissing
 * a pair twice is not an error.
 */
export async function dismissDuplicate(aId: string, bId: string): Promise<void> {
  const [person_a_id, person_b_id] = orderedPair(aId, bId);
  const { error } = await supabase
    .from('duplicate_dismissals')
    .insert({ person_a_id, person_b_id });
  // 23505 = unique violation: already dismissed.
  if (error && error.code !== '23505') throw error;
}
