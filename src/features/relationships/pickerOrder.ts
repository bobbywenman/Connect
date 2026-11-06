/** Ordering and search for step 1 of the relationship flow (KT-20). Pure. */
import { fullName, normalizeText, sortPeople } from '@/features/people/listing';

import type { PickablePerson } from './api';

export interface PickerSections {
  /** You, pinned first (absent when filtered out or when You is the from person). */
  self: PickablePerson | null;
  /** People who share a network with the from person. */
  sameNetwork: PickablePerson[];
  /** Everyone else. */
  others: PickablePerson[];
}

/** Text a search matches: full name plus nickname. */
function searchText(person: PickablePerson): string {
  return normalizeText(`${fullName(person)} ${person.preferred_name ?? ''}`);
}

/**
 * Splits the candidates into You, people in the from person's networks, and everyone else,
 * each A-Z. The from person is excluded. `fromNetworkIds` is null when the from person is
 * You, who belongs to every network, so everyone is listed as one group.
 */
export function pickerSections(
  people: readonly PickablePerson[],
  fromId: string,
  fromNetworkIds: ReadonlySet<string> | null,
  query = '',
): PickerSections {
  const needle = normalizeText(query);
  const candidates = people.filter(
    (p) => p.id !== fromId && (needle === '' || searchText(p).includes(needle)),
  );
  const sorted = sortPeople(candidates);
  const self = sorted.find((p) => p.is_self) ?? null;
  const rest = sorted.filter((p) => !p.is_self);
  if (fromNetworkIds === null) return { self, sameNetwork: rest, others: [] };
  return {
    self,
    sameNetwork: rest.filter((p) => p.networkIds.some((id) => fromNetworkIds.has(id))),
    others: rest.filter((p) => !p.networkIds.some((id) => fromNetworkIds.has(id))),
  };
}
