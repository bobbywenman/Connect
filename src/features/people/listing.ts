// Pure helpers for the per-network people list (KT-16): sorting, row labels and
// client-side filtering. No I/O, so everything here is unit tested.
import {
  badgeLabel,
  describeFrom,
  relationToMe,
  type NameLookup,
  type RelationshipRow,
  type RelationshipTypeId,
} from '@/features/relationships';

import type { Person } from './api';

/** The person columns the list needs, plus the self flag. */
export type NetworkPerson = Pick<
  Person,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'preferred_name'
  | 'photo_path'
  | 'tags'
  | 'job_title'
  | 'is_self'
> & {
    /** Cache-busting version of the photo. Optional so fixtures can leave it out. */
    updated_at?: string;
    /** Set when archived; shown only when the list has "Show archived" on. */
    archived_at?: string | null;
  };

export interface PeopleFilters {
  query?: string;
  /** Tag names; a person matches if they have ANY of them. */
  tags?: readonly string[];
  /** A person matches if ANY of their relationships (among listed people) has one of these types. */
  relationshipTypes?: readonly RelationshipTypeId[];
}

/** Lowercase and strip accents, so "José" and "jose" compare equal. */
export function normalizeText(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A–Z by last name, then first name (case and accent insensitive). People with no
 * last name sort by their first name instead. The self person is always first.
 * Returns a new array.
 */
export function sortPeople<T extends Pick<NetworkPerson, 'first_name' | 'last_name' | 'is_self'>>(
  people: readonly T[],
): T[] {
  const keyed = people.map((person) => {
    const first = normalizeText(person.first_name);
    return { person, primary: normalizeText(person.last_name) || first, first };
  });
  keyed.sort((a, b) => {
    if (a.person.is_self !== b.person.is_self) return a.person.is_self ? -1 : 1;
    return compareText(a.primary, b.primary) || compareText(a.first, b.first);
  });
  return keyed.map((k) => k.person);
}

/** "Robert Wenman", plus the nickname when it differs: "Robert Wenman (Bob)". */
export function fullName(
  person: Pick<NetworkPerson, 'first_name' | 'last_name' | 'preferred_name'>,
): string {
  const name = [person.first_name, person.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  const nickname = person.preferred_name?.trim();
  if (nickname && normalizeText(nickname) !== normalizeText(person.first_name)) {
    return `${name} (${nickname})`;
  }
  return name;
}

/**
 * The one-line description under a name: the relation to the self person ("Your
 * cousin"), else the first relationship ("Cousin of Maria"), else the job title,
 * else null. The self person has no label (the row shows "You").
 */
export function primaryLabel(
  person: Pick<NetworkPerson, 'id' | 'job_title' | 'is_self'>,
  relationships: readonly RelationshipRow[],
  selfId: string | undefined,
  names: NameLookup,
): string | null {
  if (person.is_self) return null;
  const mine = relationships.filter(
    (r) => r.source_person_id === person.id || r.target_person_id === person.id,
  );
  if (selfId) {
    for (const r of mine) {
      const label = relationToMe(r, selfId);
      if (label) return label;
    }
  }
  const first = mine[0];
  if (first) return badgeLabel(first, person.id, names);
  return person.job_title?.trim() || null;
}

/** Relationship types each person holds (what they are to the other person), by person id. */
export function relationshipTypesByPerson(
  relationships: readonly RelationshipRow[],
): Map<string, Set<RelationshipTypeId>> {
  const map = new Map<string, Set<RelationshipTypeId>>();
  const add = (personId: string, type: RelationshipTypeId) => {
    const set = map.get(personId) ?? new Set<RelationshipTypeId>();
    set.add(type);
    map.set(personId, set);
  };
  for (const r of relationships) {
    add(r.source_person_id, describeFrom(r, r.source_person_id).type);
    add(r.target_person_id, describeFrom(r, r.target_person_id).type);
  }
  return map;
}

/** Distinct tags across people, A–Z. */
export function collectTags(people: readonly Pick<NetworkPerson, 'tags'>[]): string[] {
  const byKey = new Map<string, string>();
  for (const person of people) {
    for (const tag of person.tags) {
      const key = normalizeText(tag);
      if (key && !byKey.has(key)) byKey.set(key, tag);
    }
  }
  return [...byKey.entries()].sort(([a], [b]) => compareText(a, b)).map(([, tag]) => tag);
}

/** Distinct relationship types present, as held by the listed people. */
export function collectRelationshipTypes(
  relationships: readonly RelationshipRow[],
): RelationshipTypeId[] {
  const seen = new Set<RelationshipTypeId>();
  for (const set of relationshipTypesByPerson(relationships).values()) {
    set.forEach((type) => seen.add(type));
  }
  return [...seen];
}

export function hasActiveFilters(filters: PeopleFilters): boolean {
  return (
    normalizeText(filters.query) !== '' ||
    (filters.tags?.length ?? 0) > 0 ||
    (filters.relationshipTypes?.length ?? 0) > 0
  );
}

/**
 * Query matches first, last or preferred name, or any tag (case and accent
 * insensitive substring). Tags: OR within the group. Relationship types: OR within the
 * group, using `relationships`. The groups combine with AND, as does the query.
 */
export function filterPeople<T extends NetworkPerson>(
  people: readonly T[],
  filters: PeopleFilters,
  relationships: readonly RelationshipRow[] = [],
): T[] {
  const query = normalizeText(filters.query);
  const tagKeys = new Set((filters.tags ?? []).map(normalizeText));
  const wantedTypes = new Set(filters.relationshipTypes ?? []);
  if (!query && tagKeys.size === 0 && wantedTypes.size === 0) return [...people];

  const typesByPerson = wantedTypes.size > 0 ? relationshipTypesByPerson(relationships) : null;

  return people.filter((person) => {
    if (query) {
      const haystack = [person.first_name, person.last_name, person.preferred_name, ...person.tags]
        .map(normalizeText)
        .filter(Boolean);
      if (person.is_self) haystack.push('you');
      if (!haystack.some((text) => text.includes(query))) return false;
    }
    if (tagKeys.size > 0 && !person.tags.some((tag) => tagKeys.has(normalizeText(tag)))) {
      return false;
    }
    if (typesByPerson) {
      const held = typesByPerson.get(person.id);
      if (!held || ![...wantedTypes].some((type) => held.has(type))) return false;
    }
    return true;
  });
}
