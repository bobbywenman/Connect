// Pure helpers for the attendee picker (KT-30): client-side filtering and selection math.
import { normalizeText } from '@/features/people/listing';

import type { PickerPerson } from './api';

export interface PickerFilters {
  query?: string;
  /** Show only people in this network. The self person belongs to every network (D-2). */
  networkId?: string | null;
}

/**
 * People matching the search text (first, last or preferred name, accent and case
 * insensitive; "you" finds the self person) and the network. Keeps the input order.
 */
export function filterPickerPeople<T extends PickerPerson>(
  people: readonly T[],
  { query, networkId }: PickerFilters,
): T[] {
  const needle = normalizeText(query);
  return people.filter((person) => {
    if (networkId && !person.is_self && !person.networkIds.includes(networkId)) return false;
    if (!needle) return true;
    const haystack = [person.first_name, person.last_name, person.preferred_name]
      .map(normalizeText)
      .filter(Boolean);
    if (person.is_self) haystack.push('you');
    // Also match across the full name, so "emma wen" finds Emma Wenman.
    haystack.push(normalizeText(`${person.first_name} ${person.last_name ?? ''}`));
    return haystack.some((text) => text.includes(needle));
  });
}

/** The selection with `id` flipped. Returns a new set. */
export function toggleSelected(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** The selection plus everyone in view; people outside the view keep their state. */
export function selectAllInView(
  selected: ReadonlySet<string>,
  visible: readonly Pick<PickerPerson, 'id'>[],
): Set<string> {
  const next = new Set(selected);
  visible.forEach((person) => next.add(person.id));
  return next;
}

/** True when every person in view is selected (and there is at least one). */
export function isAllInViewSelected(
  selected: ReadonlySet<string>,
  visible: readonly Pick<PickerPerson, 'id'>[],
): boolean {
  return visible.length > 0 && visible.every((person) => selected.has(person.id));
}

export function sameSelection(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** "3 selected" / "None selected". */
export function selectedLabel(count: number): string {
  return count === 0 ? 'None selected' : `${count} selected`;
}
