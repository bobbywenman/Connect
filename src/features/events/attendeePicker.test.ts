import type { PickerPerson } from './api';
import {
  filterPickerPeople,
  isAllInViewSelected,
  sameSelection,
  selectAllInView,
  selectedLabel,
  toggleSelected,
} from './attendeePicker';

const person = (id: string, first: string, extra: Partial<PickerPerson> = {}): PickerPerson => ({
  id,
  first_name: first,
  last_name: null,
  preferred_name: null,
  photo_path: null,
  updated_at: '2026-01-01T00:00:00Z',
  is_self: false,
  networkIds: [],
  ...extra,
});

const me = person('me', 'Robert', { is_self: true, last_name: 'Wenman' });
const jose = person('p1', 'José', { last_name: 'García', networkIds: ['work'] });
const emma = person('p2', 'Emma', { last_name: 'Wenman', networkIds: ['family'] });
const bob = person('p3', 'Robert', { preferred_name: 'Bob', networkIds: ['family', 'work'] });
const all = [me, jose, emma, bob];

describe('filterPickerPeople', () => {
  it('returns everyone with no filters, in order', () => {
    expect(filterPickerPeople(all, {})).toEqual(all);
    expect(filterPickerPeople(all, { query: '  ', networkId: null })).toEqual(all);
  });

  it('matches names ignoring case and accents', () => {
    expect(filterPickerPeople(all, { query: 'jose' })).toEqual([jose]);
    expect(filterPickerPeople(all, { query: 'GARCÍA' })).toEqual([jose]);
    expect(filterPickerPeople(all, { query: 'bob' })).toEqual([bob]);
    expect(filterPickerPeople(all, { query: 'emma wen' })).toEqual([emma]);
  });

  it('finds the self person by "you"', () => {
    expect(filterPickerPeople(all, { query: 'you' })).toEqual([me]);
  });

  it('narrows to a network, keeping the self person', () => {
    expect(filterPickerPeople(all, { networkId: 'family' })).toEqual([me, emma, bob]);
    expect(filterPickerPeople(all, { networkId: 'work' })).toEqual([me, jose, bob]);
  });

  it('combines query and network', () => {
    expect(filterPickerPeople(all, { query: 'robert', networkId: 'work' })).toEqual([me, bob]);
    expect(filterPickerPeople(all, { query: 'emma', networkId: 'work' })).toEqual([]);
  });
});

describe('selection helpers', () => {
  it('toggles without mutating', () => {
    const start = new Set(['a']);
    expect([...toggleSelected(start, 'b')]).toEqual(['a', 'b']);
    expect([...toggleSelected(start, 'a')]).toEqual([]);
    expect([...start]).toEqual(['a']);
  });

  it('selects everyone in view and keeps people outside it', () => {
    const next = selectAllInView(new Set(['x']), [jose, emma]);
    expect([...next].sort()).toEqual(['p1', 'p2', 'x']);
  });

  it('knows when everyone in view is selected', () => {
    expect(isAllInViewSelected(new Set(['p1', 'p2']), [jose, emma])).toBe(true);
    expect(isAllInViewSelected(new Set(['p1']), [jose, emma])).toBe(false);
    expect(isAllInViewSelected(new Set(['p1']), [])).toBe(false);
  });

  it('compares selections regardless of order', () => {
    expect(sameSelection(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(sameSelection(new Set(['a']), new Set(['a', 'b']))).toBe(false);
    expect(sameSelection(new Set(['a', 'c']), new Set(['a', 'b']))).toBe(false);
  });

  it('labels the count', () => {
    expect(selectedLabel(0)).toBe('None selected');
    expect(selectedLabel(3)).toBe('3 selected');
  });
});
