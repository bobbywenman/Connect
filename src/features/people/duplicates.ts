// Pure duplicate detection (KT-33). No I/O: the api layer supplies people and dismissals.
//
// Two people are a likely duplicate when their last names match and their first names
// overlap, where a first name set is the first name plus the preferred name ("Robert"
// and "Bob" both count for Robert (Bob) Wenman). People without a last name only match
// as "possible" when both have no last name, share a first name AND share a network.
// The self person (D-2) is never paired, and dismissed pairs are never shown again.
import { normalizeText } from './listing';

export interface DuplicateCandidate {
  /** Absent for a person who has not been saved yet. */
  id?: string;
  first_name: string;
  last_name: string | null;
  preferred_name: string | null;
  is_self?: boolean;
  networkIds: readonly string[];
}

export type DuplicatePerson = DuplicateCandidate & { id: string };

/** A stored "not duplicates" decision. Order of the two ids does not matter. */
export interface Dismissal {
  person_a_id: string;
  person_b_id: string;
}

export type DuplicateConfidence = 'likely' | 'possible';

export interface DuplicateMatch<T extends DuplicatePerson = DuplicatePerson> {
  person: T;
  confidence: DuplicateConfidence;
}

export interface DuplicatePair<T extends DuplicatePerson = DuplicatePerson> {
  a: T;
  b: T;
  confidence: DuplicateConfidence;
}

/** Trim, lowercase, strip accents and collapse runs of whitespace. */
export function normalizeName(text: string | null | undefined): string {
  return normalizeText(text).replace(/\s+/g, ' ');
}

/** The two ids in the order the database stores them (`person_a_id < person_b_id`). */
export function orderedPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

const pairKey = (x: string, y: string) => orderedPair(x, y).join('|');

function dismissalKeys(dismissals: readonly Dismissal[]): Set<string> {
  return new Set(dismissals.map((d) => pairKey(d.person_a_id, d.person_b_id)));
}

/**
 * Every normalized name the person answers to as a first name: the first name, the
 * preferred name, and a nickname written in brackets inside the first name
 * ("Robert (Bob)" gives "robert" and "bob").
 */
function firstNames(p: Pick<DuplicateCandidate, 'first_name' | 'preferred_name'>): Set<string> {
  const names = new Set<string>();
  const add = (text: string) => {
    const n = normalizeName(text);
    if (n) names.add(n);
  };
  const bracket = /\(([^)]*)\)/g;
  const raw = p.first_name ?? '';
  for (const m of raw.matchAll(bracket)) add(m[1] ?? '');
  add(raw.replace(bracket, ' '));
  add(p.preferred_name ?? '');
  return names;
}

function compare(a: DuplicateCandidate, b: DuplicateCandidate): DuplicateConfidence | null {
  if (a.is_self || b.is_self) return null;
  const aFirst = firstNames(a);
  const bFirst = firstNames(b);
  if (![...aFirst].some((n) => bFirst.has(n))) return null;

  const aLast = normalizeName(a.last_name);
  const bLast = normalizeName(b.last_name);
  if (aLast && bLast) return aLast === bLast ? 'likely' : null;
  if (aLast || bLast) return null;
  // Both only have a first name: too weak on its own, so require a shared network.
  const shared = a.networkIds.some((n) => b.networkIds.includes(n));
  return shared ? 'possible' : null;
}

const rank = (c: DuplicateConfidence) => (c === 'likely' ? 0 : 1);

/** Existing people that look like `candidate`, likely matches first. */
export function findDuplicatesFor<T extends DuplicatePerson>(
  candidate: DuplicateCandidate,
  people: readonly T[],
  dismissals: readonly Dismissal[] = [],
): DuplicateMatch<T>[] {
  if (candidate.is_self) return [];
  const dismissed = dismissalKeys(dismissals);
  const matches: DuplicateMatch<T>[] = [];
  for (const person of people) {
    if (candidate.id && person.id === candidate.id) continue;
    if (candidate.id && dismissed.has(pairKey(candidate.id, person.id))) continue;
    const confidence = compare(candidate, person);
    if (confidence) matches.push({ person, confidence });
  }
  return matches.sort((x, y) => rank(x.confidence) - rank(y.confidence));
}

/** Every likely duplicate pair among `people`, each pair once, likely before possible. */
export function findAllDuplicatePairs<T extends DuplicatePerson>(
  people: readonly T[],
  dismissals: readonly Dismissal[] = [],
): DuplicatePair<T>[] {
  const dismissed = dismissalKeys(dismissals);
  const pairs: DuplicatePair<T>[] = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]!;
      const b = people[j]!;
      if (a.id === b.id || dismissed.has(pairKey(a.id, b.id))) continue;
      const confidence = compare(a, b);
      if (confidence) pairs.push({ a, b, confidence });
    }
  }
  return pairs.sort((x, y) => rank(x.confidence) - rank(y.confidence));
}

export interface ImportBatchResult<C extends DuplicateCandidate, T extends DuplicatePerson> {
  candidate: C;
  matches: DuplicateMatch<T>[];
}

/**
 * Import-time check (contacts and LinkedIn, KT-31/32): per candidate, the existing
 * people it matches. Candidates in the same batch are also checked against each
 * other, so a file that lists someone twice is caught; those matches are reported
 * on the later candidate with a synthetic id of `batch:<index>`.
 */
export function checkImportBatch<C extends DuplicateCandidate, T extends DuplicatePerson>(
  candidates: readonly C[],
  existing: readonly T[],
  dismissals: readonly Dismissal[] = [],
): ImportBatchResult<C, T>[] {
  return candidates.map((candidate, index) => {
    const earlier = candidates.slice(0, index).map((c, i) => ({ ...c, id: `batch:${i}` }));
    const matches = findDuplicatesFor(candidate, [...existing, ...earlier] as T[], dismissals);
    return { candidate, matches };
  });
}

/**
 * Warning text for the save dialog, e.g. "Robert Wenman is already in Wenman Family."
 * Names the first match and its networks; further matches are counted.
 */
export function describeMatches(
  matches: readonly DuplicateMatch[],
  networkNames: ReadonlyMap<string, string>,
): string {
  const first = matches[0];
  if (!first) return '';
  const p = first.person;
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
  const names = p.networkIds.map((id) => networkNames.get(id)).filter((n): n is string => !!n);
  const where = names.length > 0 ? names.join(' and ') : 'your people';
  const more = matches.length - 1;
  const extra = more > 0 ? ` (and ${more} more similar ${more === 1 ? 'person' : 'people'})` : '';
  return `${name} is already in ${where}.${extra}`;
}
