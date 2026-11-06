// Pure review state for the import picker (KT-31, reused by KT-32). No I/O.
//
// Rows are `new`, `already` (this source id is already in KnowThem; cannot be picked) or
// `duplicate` (looks like someone already in KnowThem or earlier in the list). A duplicate
// row is skipped unless the user picks "Import anyway", which is the same thing as
// selecting it: `selected` holds every key that will be imported.
import {
  checkImportBatch,
  describeMatches,
  type Dismissal,
  type DuplicatePerson,
} from '@/features/people/duplicates';
import { normalizeText } from '@/features/people/listing';

import { candidateName, candidateSubtitle, type ImportCandidate } from './types';

export type ReviewStatus = 'new' | 'already' | 'duplicate';

export interface ReviewRow {
  candidate: ImportCandidate;
  status: ReviewStatus;
  /** Why a duplicate row is flagged, e.g. "Robert Wenman is already in Family." */
  note: string | null;
  name: string;
  subtitle: string | null;
  /** Lowercase, accent-free text the search box matches against. */
  searchText: string;
}

export interface ReviewInput {
  candidates: readonly ImportCandidate[];
  existing: readonly DuplicatePerson[];
  dismissals: readonly Dismissal[];
  /** Source ids already imported, e.g. contact ids (matched against `source.externalIds[importSource]`). */
  importedIds: ReadonlySet<string>;
  /** Network the people will be added to; makes "same first name, no last name" checks meaningful. */
  networkId: string | undefined;
  networkNames: ReadonlyMap<string, string>;
}

function sortKey(row: ReviewRow): [string, string] {
  const f = row.candidate.fields;
  const first = normalizeText(f.firstName);
  return [normalizeText(f.lastName) || first, first];
}

function compareRows(a: ReviewRow, b: ReviewRow): number {
  const [a1, a2] = sortKey(a);
  const [b1, b2] = sortKey(b);
  if (a1 !== b1) return a1 < b1 ? -1 : 1;
  if (a2 !== b2) return a2 < b2 ? -1 : 1;
  return 0;
}

/** Classify every candidate. Sorted A-Z by last name, then first name. */
export function buildReviewRows(input: ReviewInput): ReviewRow[] {
  const isImported = (c: ImportCandidate) => {
    const id = c.source.externalIds[c.source.importSource];
    return !!id && input.importedIds.has(id);
  };
  const fresh = input.candidates.filter((c) => !isImported(c));
  const checked = checkImportBatch(
    fresh.map((c) => ({
      key: c.key,
      first_name: c.fields.firstName,
      last_name: c.fields.lastName,
      preferred_name: c.fields.preferredName,
      networkIds: input.networkId ? [input.networkId] : [],
    })),
    input.existing,
    input.dismissals,
  );
  const matchesByKey = new Map(checked.map((r) => [r.candidate.key, r.matches]));

  const rows = input.candidates.map((candidate): ReviewRow => {
    const name = candidateName(candidate);
    const subtitle = candidateSubtitle(candidate);
    const base = {
      candidate,
      name,
      subtitle,
      searchText: normalizeText(
        [name, candidate.fields.preferredName, candidate.fields.company, candidate.fields.jobTitle]
          .filter(Boolean)
          .join(' '),
      ),
    };
    if (isImported(candidate)) return { ...base, status: 'already', note: null };
    const matches = matchesByKey.get(candidate.key) ?? [];
    if (matches.length === 0) return { ...base, status: 'new', note: null };
    // Matches against an earlier row in this same list carry a synthetic `batch:` id.
    const known = matches.filter((m) => !m.person.id.startsWith('batch:'));
    const note =
      known.length > 0
        ? describeMatches(known, input.networkNames)
        : 'Appears more than once in this list.';
    return { ...base, status: 'duplicate', note };
  });
  return rows.sort(compareRows);
}

/** Rows whose name, nickname, company or job title contains the query (accent and case insensitive). */
export function filterRows(rows: readonly ReviewRow[], query: string): ReviewRow[] {
  const q = normalizeText(query);
  return q ? rows.filter((r) => r.searchText.includes(q)) : [...rows];
}

export const toggleKey = (selected: ReadonlySet<string>, key: string): Set<string> => {
  const next = new Set(selected);
  if (!next.delete(key)) next.add(key);
  return next;
};

export const setKey = (selected: ReadonlySet<string>, key: string, on: boolean): Set<string> => {
  const next = new Set(selected);
  if (on) next.add(key);
  else next.delete(key);
  return next;
};

/** Add every plain "new" row in `visible`. Duplicates stay on Skip; "already" rows cannot be picked. */
export function selectAll(
  selected: ReadonlySet<string>,
  visible: readonly ReviewRow[],
): Set<string> {
  const next = new Set(selected);
  for (const row of visible) if (row.status === 'new') next.add(row.candidate.key);
  return next;
}

export const clearSelection = (): Set<string> => new Set();

/** The candidates that will be imported: selected, not already imported. */
export function candidatesToImport(
  rows: readonly ReviewRow[],
  selected: ReadonlySet<string>,
): ImportCandidate[] {
  return rows
    .filter((r) => r.status !== 'already' && selected.has(r.candidate.key))
    .map((r) => r.candidate);
}

export interface SkipCounts {
  already: number;
  duplicates: number;
}

/** What the summary calls "skipped": rows already in KnowThem plus duplicates left on Skip. */
export function countSkipped(
  rows: readonly ReviewRow[],
  selected: ReadonlySet<string>,
): SkipCounts {
  return {
    already: rows.filter((r) => r.status === 'already').length,
    duplicates: rows.filter((r) => r.status === 'duplicate' && !selected.has(r.candidate.key))
      .length,
  };
}
