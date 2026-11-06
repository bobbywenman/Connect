// Pure helpers for the person detail screen (KT-17): names, relationship wording and
// which sections have something to show. No I/O.
import {
  badgeLabel,
  describeFrom,
  displayName,
  getRelationshipType,
  relationToMe,
  type NameLookup,
} from '@/features/relationships';

import type { Person, PersonConnection } from './api';
import { normalizeText, sortPeople } from './listing';

/** "Robert Wenman" plus a separate nickname when it differs from the first name. */
export function nameParts(person: Pick<Person, 'first_name' | 'last_name' | 'preferred_name'>): {
  name: string;
  nickname: string | null;
} {
  const name = [person.first_name, person.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  const nickname = person.preferred_name?.trim();
  const different = !!nickname && normalizeText(nickname) !== normalizeText(person.first_name);
  return { name, nickname: different ? nickname : null };
}

/** Text a section shows, or null when it is empty or only whitespace (so it is hidden). */
export function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Relationship badges for the top of the page, from this person's side: "Cousin of Maria",
 * or "Your cousin" when the other end is the self person (same wording as the people list).
 * The self person's own page has none: their connections are listed with "Your ..." instead.
 */
export function relationshipBadges(
  person: Pick<Person, 'id' | 'is_self'>,
  connections: readonly PersonConnection[],
): { id: string; label: string }[] {
  if (person.is_self) return [];
  const names: NameLookup = (id) => connections.find((c) => c.person.id === id)?.person;
  return connections.map(({ relationship, person: other }) => ({
    id: relationship.id,
    label: other.is_self
      ? (relationToMe(relationship, other.id) ?? badgeLabel(relationship, person.id, names))
      : badgeLabel(relationship, person.id, names),
  }));
}

function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

/**
 * What the connection is to the person whose page this is, for the row under the
 * connection's name: "Your sister" on your own page, "Robert's sister" elsewhere.
 */
export function connectionLabel(
  page: Pick<Person, 'id' | 'first_name' | 'preferred_name' | 'is_self'>,
  connection: PersonConnection,
): string {
  const view = describeFrom(connection.relationship, connection.person.id);
  const typeLabel =
    view.customLabel ?? (getRelationshipType(view.type)?.label ?? view.type).toLowerCase();
  const owner = page.is_self ? 'Your' : possessive(displayName(page));
  return `${owner} ${typeLabel}`;
}

/** Connections ordered like the people list: You first, then A-Z by last then first name. */
export function sortConnections(connections: readonly PersonConnection[]): PersonConnection[] {
  const order = new Map(sortPeople(connections.map((c) => c.person)).map((p, i) => [p.id, i]));
  return [...connections].sort(
    (a, b) =>
      (order.get(a.person.id) ?? 0) - (order.get(b.person.id) ?? 0) ||
      a.relationship.id.localeCompare(b.relationship.id),
  );
}

/** Cache key that changes when the photo is replaced (the path stays the same). */
export function photoCacheKey(person: {
  photo_path: string | null;
  updated_at?: string;
}): string | undefined {
  return person.photo_path ? `${person.photo_path}?v=${person.updated_at ?? ''}` : undefined;
}
