import { buildRelationship, type RelationshipRow } from '@/features/relationships';

import {
  collectRelationshipTypes,
  collectTags,
  filterPeople,
  fullName,
  hasActiveFilters,
  normalizeText,
  primaryLabel,
  sortPeople,
  type NetworkPerson,
} from './listing';

let counter = 0;
function person(overrides: Partial<NetworkPerson> = {}): NetworkPerson {
  counter += 1;
  return {
    id: `p${counter}`,
    first_name: 'Sam',
    last_name: null,
    preferred_name: null,
    photo_path: null,
    tags: [],
    job_title: null,
    is_self: false,
    ...overrides,
  };
}

const ME = person({ id: 'me', first_name: 'Alex', last_name: 'Wenman', is_self: true });
const maria = person({ id: 'maria', first_name: 'Maria', last_name: 'Lopez' });
const names = (id: string) => (id === 'me' ? ME : id === 'maria' ? maria : undefined);

describe('normalizeText', () => {
  it('lowercases, trims and strips accents', () => {
    expect(normalizeText('  José ÉLAN ')).toBe('jose elan');
    expect(normalizeText(null)).toBe('');
  });
});

describe('sortPeople', () => {
  it('sorts by last name, then first name, ignoring case and accents', () => {
    const sorted = sortPeople([
      person({ first_name: 'Zed', last_name: 'smith' }),
      person({ first_name: 'Ann', last_name: 'Smith' }),
      person({ first_name: 'Eve', last_name: 'Álvarez' }),
      person({ first_name: 'Bob', last_name: 'Zimmer' }),
    ]);
    expect(sorted.map((p) => p.first_name)).toEqual(['Eve', 'Ann', 'Zed', 'Bob']);
  });

  it('sorts people without a last name by first name, alongside last names', () => {
    const sorted = sortPeople([
      person({ first_name: 'Zoe', last_name: 'Adams' }),
      person({ first_name: 'Cher' }),
      person({ first_name: 'Ana', last_name: '' }),
      person({ first_name: 'Xavier', last_name: 'Brown' }),
    ]);
    expect(sorted.map((p) => p.first_name)).toEqual(['Zoe', 'Ana', 'Xavier', 'Cher']);
  });

  it('pins the self person first and does not mutate the input', () => {
    const input = [person({ first_name: 'Al', last_name: 'Aaron' }), ME];
    const sorted = sortPeople(input);
    expect(sorted[0]).toBe(ME);
    expect(input[0]!.first_name).toBe('Al');
  });
});

describe('fullName', () => {
  it('shows a nickname in parentheses when it differs from the first name', () => {
    expect(fullName({ first_name: 'Robert', last_name: 'Wenman', preferred_name: 'Bob' })).toBe(
      'Robert Wenman (Bob)',
    );
  });

  it('omits the nickname when it equals the first name or is missing', () => {
    expect(fullName({ first_name: 'Robert', last_name: 'W', preferred_name: 'robert' })).toBe(
      'Robert W',
    );
    expect(fullName({ first_name: 'Cher', last_name: null, preferred_name: null })).toBe('Cher');
  });
});

describe('primaryLabel', () => {
  const cousinOfMe = buildRelationship('me', 'cuz', 'cousin');
  const cuz = person({ id: 'cuz', first_name: 'Jake', last_name: 'Wenman', job_title: 'Chef' });

  it('prefers the relation to Me', () => {
    const toMaria = buildRelationship('cuz', 'maria', 'friend');
    expect(primaryLabel(cuz, [toMaria, cousinOfMe], 'me', names)).toBe('Your cousin');
  });

  it('uses the direction of the relationship (parent vs child)', () => {
    const dad = person({ id: 'dad' });
    const row = buildRelationship('me', 'dad', 'child'); // I am dad's child, so dad is my parent
    expect(primaryLabel(dad, [row], 'me', names)).toBe('Your parent');
  });

  it('falls back to the first relationship badge when not related to Me', () => {
    const row = buildRelationship('cuz', 'maria', 'coworker');
    expect(primaryLabel(cuz, [row], 'me', names)).toBe('Coworker of Maria');
  });

  it('falls back to the job title, then null', () => {
    expect(primaryLabel(cuz, [], 'me', names)).toBe('Chef');
    expect(primaryLabel({ ...cuz, job_title: ' ' }, [], 'me', names)).toBeNull();
    expect(primaryLabel({ ...cuz, job_title: null }, [], undefined, names)).toBeNull();
  });

  it('has no label for the self person', () => {
    expect(primaryLabel(ME, [cousinOfMe], 'me', names)).toBeNull();
  });

  it('ignores relationships between other people', () => {
    const row = buildRelationship('maria', 'cuz', 'friend');
    expect(primaryLabel(person({ id: 'zzz', job_title: 'Dev' }), [row], 'me', names)).toBe('Dev');
  });

  it('uses custom wording', () => {
    const row = buildRelationship('me', 'cuz', 'custom', {
      label: 'Landlord',
      inverseLabel: 'Tenant',
    });
    expect(primaryLabel(cuz, [row], 'me', names)).toBe('Your tenant');
  });
});

describe('filterPeople', () => {
  const ann = person({ id: 'ann', first_name: 'Ann', last_name: 'Müller', tags: ['Book club'] });
  const bob = person({
    id: 'bob',
    first_name: 'Robert',
    last_name: 'Jones',
    preferred_name: 'Bobby',
    tags: ['Work', 'Gym'],
  });
  const cy = person({ id: 'cy', first_name: 'Cy', tags: ['gym'] });
  const everyone = [ME, ann, bob, cy];
  const rels: RelationshipRow[] = [
    buildRelationship('me', 'ann', 'cousin'),
    buildRelationship('me', 'bob', 'coworker'),
    buildRelationship('me', 'cy', 'cousin'),
  ];

  const ids = (list: NetworkPerson[]) => list.map((p) => p.id);

  it('returns everyone with no filters', () => {
    expect(ids(filterPeople(everyone, {}))).toEqual(['me', 'ann', 'bob', 'cy']);
    expect(
      ids(filterPeople(everyone, { query: '  ', tags: [], relationshipTypes: [] })),
    ).toHaveLength(4);
  });

  it('matches first, last and preferred names, case and accent insensitively', () => {
    expect(ids(filterPeople(everyone, { query: 'MULLER' }))).toEqual(['ann']);
    expect(ids(filterPeople(everyone, { query: 'jon' }))).toEqual(['bob']);
    expect(ids(filterPeople(everyone, { query: 'bobb' }))).toEqual(['bob']);
    expect(ids(filterPeople(everyone, { query: 'rob' }))).toEqual(['bob']);
  });

  it('matches tags in the query', () => {
    expect(ids(filterPeople(everyone, { query: 'book' }))).toEqual(['ann']);
    expect(ids(filterPeople(everyone, { query: 'gym' }))).toEqual(['bob', 'cy']);
  });

  it('lets "you" find the self person', () => {
    expect(ids(filterPeople(everyone, { query: 'you' }))).toEqual(['me']);
  });

  it('ORs tags within the group, ignoring case', () => {
    expect(ids(filterPeople(everyone, { tags: ['Book club', 'work'] }))).toEqual(['ann', 'bob']);
  });

  it('ORs relationship types within the group', () => {
    expect(ids(filterPeople(everyone, { relationshipTypes: ['cousin'] }, rels))).toEqual([
      'me',
      'ann',
      'cy',
    ]);
    expect(
      ids(filterPeople(everyone, { relationshipTypes: ['coworker', 'cousin'] }, rels)),
    ).toHaveLength(4);
  });

  it('ANDs across the query, tags and relationship types', () => {
    expect(
      ids(filterPeople(everyone, { tags: ['Gym'], relationshipTypes: ['cousin'] }, rels)),
    ).toEqual(['cy']);
    expect(ids(filterPeople(everyone, { query: 'cy', tags: ['Work'] }, rels))).toEqual([]);
  });

  it('excludes people with no relationships when filtering by type', () => {
    expect(ids(filterPeople(everyone, { relationshipTypes: ['friend'] }, rels))).toEqual([]);
  });
});

describe('collectors and flags', () => {
  it('collects distinct tags A-Z, merging case variants', () => {
    const tags = collectTags([
      person({ tags: ['work', 'Gym'] }),
      person({ tags: ['Work', 'book club'] }),
    ]);
    expect(tags).toEqual(['book club', 'Gym', 'work']);
  });

  it('collects the relationship types people hold', () => {
    const types = collectRelationshipTypes([buildRelationship('me', 'x', 'parent')]);
    expect(types.sort()).toEqual(['child', 'parent']);
  });

  it('detects active filters', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ query: ' ' })).toBe(false);
    expect(hasActiveFilters({ tags: ['x'] })).toBe(true);
    expect(hasActiveFilters({ relationshipTypes: ['friend'] })).toBe(true);
  });
});
