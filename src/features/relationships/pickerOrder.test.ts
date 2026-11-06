import type { PickablePerson } from './api';
import { pickerSections } from './pickerOrder';

function person(id: string, first: string, networkIds: string[], extra = {}): PickablePerson {
  return {
    id,
    first_name: first,
    last_name: null,
    preferred_name: null,
    photo_path: null,
    updated_at: '',
    is_self: false,
    networkIds,
    ...extra,
  };
}

const people = [
  person('zoe', 'Zoe', ['work']),
  person('me', 'Alex', [], { is_self: true }),
  person('amy', 'Amy', ['family']),
  person('bo', 'Bo', ['family', 'work']),
  person('cy', 'Cy', ['club']),
  person('sarah', 'Sarah', ['family']),
];

describe('pickerSections', () => {
  it('pins You, lists shared-network people first, then everyone else, A-Z', () => {
    const s = pickerSections(people, 'sarah', new Set(['family']));
    expect(s.self?.id).toBe('me');
    expect(s.sameNetwork.map((p) => p.id)).toEqual(['amy', 'bo']);
    expect(s.others.map((p) => p.id)).toEqual(['cy', 'zoe']);
  });

  it('excludes the from person', () => {
    const s = pickerSections(people, 'amy', new Set(['family']));
    const all = [s.self, ...s.sameNetwork, ...s.others].map((p) => p?.id);
    expect(all).not.toContain('amy');
  });

  it('leaves You out when You is the from person and lists everyone as one group', () => {
    const s = pickerSections(people, 'me', null);
    expect(s.self).toBeNull();
    expect(s.others).toEqual([]);
    expect(s.sameNetwork.map((p) => p.id)).toEqual(['amy', 'bo', 'cy', 'sarah', 'zoe']);
  });

  it('filters by name ignoring case and accents, and can filter You out', () => {
    const withAccent = [...people, person('jose', 'José', ['club'])];
    expect(
      pickerSections(withAccent, 'sarah', new Set(['family']), 'jose').others.map((p) => p.id),
    ).toEqual(['jose']);
    const s = pickerSections(people, 'sarah', new Set(['family']), 'AM');
    expect(s.self).toBeNull();
    expect(s.sameNetwork.map((p) => p.id)).toEqual(['amy']);
  });
});
