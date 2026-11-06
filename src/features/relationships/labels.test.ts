import {
  badgeLabel,
  buildRelationship,
  decodeCustomLabel,
  describeFrom,
  displayName,
  getRelationshipType,
  inverseOf,
  isDuplicate,
  isSymmetric,
  listByCategory,
  listRelationshipTypes,
  relationToMe,
  sentence,
  type NameLookup,
} from './index';
import { RELATIONSHIP_CATEGORIES, RELATIONSHIP_TYPES } from './types';

const SARAH = 'p-sarah';
const MARIA = 'p-maria';
const ME = 'p-me';

const people: Record<string, { first_name: string; preferred_name?: string | null }> = {
  [SARAH]: { first_name: 'Sarah' },
  [MARIA]: { first_name: 'Maria', preferred_name: 'Mari' },
  [ME]: { first_name: 'Alex' },
  'p-james': { first_name: 'James' },
};
const names: NameLookup = (id) => people[id];

describe('catalog', () => {
  it('has the expected ids in order', () => {
    expect(listRelationshipTypes().map((x) => x.id)).toEqual([
      'parent',
      'child',
      'sibling',
      'spouse',
      'grandparent',
      'grandchild',
      'aunt_uncle',
      'niece_nephew',
      'cousin',
      'in_law',
      'manager',
      'direct_report',
      'mentor',
      'mentee',
      'coworker',
      'client',
      'provider',
      'friend',
      'acquaintance',
      'neighbor',
      'custom',
    ]);
  });

  it('has unique ids and non-empty labels', () => {
    const ids = RELATIONSHIP_TYPES.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    RELATIONSHIP_TYPES.forEach((x) => expect(x.label.length).toBeGreaterThan(0));
  });

  it('uses the specified display labels', () => {
    expect(getRelationshipType('spouse')?.label).toBe('Spouse / partner');
    expect(getRelationshipType('aunt_uncle')?.label).toBe('Aunt / uncle');
    expect(getRelationshipType('niece_nephew')?.label).toBe('Niece / nephew');
    expect(getRelationshipType('in_law')?.label).toBe('In-law');
    expect(getRelationshipType('direct_report')?.label).toBe('Direct report');
    expect(getRelationshipType('provider')?.label).toBe('Provider');
  });

  it('getRelationshipType returns undefined for unknown ids', () => {
    expect(getRelationshipType('nope')).toBeUndefined();
  });

  it.each(RELATIONSHIP_TYPES.map((x) => x.id))('inverse round-trips for %s', (id) => {
    expect(inverseOf(inverseOf(id))).toBe(id);
    expect(getRelationshipType(inverseOf(id))).toBeDefined();
  });

  it('maps asymmetric pairs', () => {
    expect(inverseOf('parent')).toBe('child');
    expect(inverseOf('grandparent')).toBe('grandchild');
    expect(inverseOf('aunt_uncle')).toBe('niece_nephew');
    expect(inverseOf('manager')).toBe('direct_report');
    expect(inverseOf('mentor')).toBe('mentee');
    expect(inverseOf('client')).toBe('provider');
    expect(inverseOf('provider')).toBe('client');
  });

  it.each([
    'sibling',
    'spouse',
    'cousin',
    'in_law',
    'coworker',
    'friend',
    'acquaintance',
    'neighbor',
    'custom',
  ])('%s is symmetric', (id) => {
    expect(isSymmetric(id)).toBe(true);
    expect(inverseOf(id)).toBe(id);
  });

  it('asymmetric types are not symmetric', () => {
    expect(isSymmetric('parent')).toBe(false);
    expect(isSymmetric('client')).toBe(false);
  });

  it('throws for unknown ids', () => {
    expect(() => inverseOf('nope')).toThrow('Unknown relationship type');
    expect(() => isSymmetric('nope')).toThrow('Unknown relationship type');
  });

  it('lists every category in order, covering every type exactly once', () => {
    const groups = listByCategory();
    expect(groups.map((g) => g.category)).toEqual([...RELATIONSHIP_CATEGORIES]);
    expect(groups.map((g) => g.label)).toEqual(['Family', 'Professional', 'Social', 'Other']);
    expect(groups.map((g) => g.types.length)).toEqual([10, 7, 3, 1]);
    expect(groups.flatMap((g) => g.types)).toHaveLength(RELATIONSHIP_TYPES.length);
    groups.forEach((g) => g.types.forEach((x) => expect(x.category).toBe(g.category)));
  });
});

describe('buildRelationship', () => {
  it('builds an asymmetric row', () => {
    expect(buildRelationship(SARAH, MARIA, 'parent')).toEqual({
      source_person_id: SARAH,
      target_person_id: MARIA,
      type: 'parent',
      inverse_type: 'child',
      custom_label: null,
    });
  });

  it('builds a symmetric row', () => {
    const row = buildRelationship(SARAH, MARIA, 'cousin');
    expect(row.type).toBe('cousin');
    expect(row.inverse_type).toBe('cousin');
    expect(row.custom_label).toBeNull();
  });

  it('defaults the custom inverse label to the label', () => {
    const row = buildRelationship(SARAH, MARIA, 'custom', { label: '  Climbing partner ' });
    expect(row).toMatchObject({
      type: 'custom',
      inverse_type: 'custom',
      custom_label: 'Climbing partner',
    });
  });

  it('stores distinct custom labels for both sides', () => {
    const row = buildRelationship(SARAH, MARIA, 'custom', {
      label: 'Landlord',
      inverseLabel: 'Tenant',
    });
    expect(row.custom_label).toBe('Landlord|Tenant');
    expect(decodeCustomLabel(row.custom_label)).toEqual({
      label: 'Landlord',
      inverseLabel: 'Tenant',
    });
  });

  it('collapses an identical inverse label', () => {
    const row = buildRelationship(SARAH, MARIA, 'custom', { label: 'Pal', inverseLabel: 'Pal' });
    expect(row.custom_label).toBe('Pal');
  });

  it('rejects self links', () => {
    expect(() => buildRelationship(SARAH, SARAH, 'friend')).toThrow('themselves');
  });

  it('rejects unknown types', () => {
    // @ts-expect-error deliberately invalid id
    expect(() => buildRelationship(SARAH, MARIA, 'nope')).toThrow('Unknown relationship type');
  });

  it('requires a label for custom', () => {
    expect(() => buildRelationship(SARAH, MARIA, 'custom')).toThrow('need a label');
  });

  it('validates custom labels', () => {
    expect(() => buildRelationship(SARAH, MARIA, 'custom', { label: '   ' })).toThrow('empty');
    expect(() => buildRelationship(SARAH, MARIA, 'custom', { label: 'a|b' })).toThrow(
      'cannot contain',
    );
    expect(() =>
      buildRelationship(SARAH, MARIA, 'custom', { label: 'x', inverseLabel: ' ' }),
    ).toThrow('empty');
    expect(() =>
      buildRelationship(SARAH, MARIA, 'custom', {
        label: 'a'.repeat(30),
        inverseLabel: 'b'.repeat(30),
      }),
    ).toThrow('50 characters');
  });

  it('decodes null and missing inverse', () => {
    expect(decodeCustomLabel(null)).toEqual({ label: '', inverseLabel: '' });
    expect(decodeCustomLabel('Pal')).toEqual({ label: 'Pal', inverseLabel: 'Pal' });
  });
});

describe('describeFrom', () => {
  const row = buildRelationship(SARAH, MARIA, 'parent');

  it('returns the type for the source', () => {
    expect(describeFrom(row, SARAH)).toEqual({ type: 'parent', otherPersonId: MARIA });
  });

  it('returns the inverse type for the target', () => {
    expect(describeFrom(row, MARIA)).toEqual({ type: 'child', otherPersonId: SARAH });
  });

  it('returns custom wording per side', () => {
    const custom = buildRelationship(SARAH, MARIA, 'custom', {
      label: 'Landlord',
      inverseLabel: 'Tenant',
    });
    expect(describeFrom(custom, SARAH).customLabel).toBe('Landlord');
    expect(describeFrom(custom, MARIA).customLabel).toBe('Tenant');
  });

  it('throws when the viewer is not in the relationship', () => {
    expect(() => describeFrom(row, ME)).toThrow('not part');
  });
});

describe('labels', () => {
  const cousin = buildRelationship(SARAH, MARIA, 'cousin');
  const parent = buildRelationship(SARAH, MARIA, 'parent');
  const custom = buildRelationship(SARAH, MARIA, 'custom', {
    label: 'landlord',
    inverseLabel: 'Tenant',
  });

  it('displayName prefers preferred name, then first name, then fallback', () => {
    expect(displayName(people[MARIA])).toBe('Mari');
    expect(displayName(people[SARAH])).toBe('Sarah');
    expect(displayName({ first_name: ' Bo ', preferred_name: '  ' })).toBe('Bo');
    expect(displayName(undefined)).toBe('Someone');
  });

  it('badgeLabel from both sides', () => {
    expect(badgeLabel(cousin, SARAH, names)).toBe('Cousin of Mari');
    expect(badgeLabel(cousin, MARIA, names)).toBe('Cousin of Sarah');
    expect(badgeLabel(parent, SARAH, names)).toBe('Parent of Mari');
    expect(badgeLabel(parent, MARIA, names)).toBe('Child of Sarah');
  });

  it('badgeLabel handles custom labels and unknown people', () => {
    expect(badgeLabel(custom, SARAH, names)).toBe('Landlord of Mari');
    expect(badgeLabel(custom, MARIA, names)).toBe('Tenant of Sarah');
    expect(badgeLabel(cousin, SARAH, () => undefined)).toBe('Cousin of Someone');
  });

  it('sentence from both sides', () => {
    expect(sentence(cousin, SARAH, names)).toBe("Sarah is Mari's cousin");
    expect(sentence(parent, MARIA, names)).toBe("Mari is Sarah's child");
    expect(sentence(buildRelationship(SARAH, MARIA, 'spouse'), SARAH, names)).toBe(
      "Sarah is Mari's spouse / partner",
    );
  });

  it('sentence handles custom labels and names ending in s', () => {
    expect(sentence(custom, SARAH, names)).toBe("Sarah is Mari's landlord");
    expect(sentence(custom, MARIA, names)).toBe("Mari is Sarah's tenant");
    const withJames = buildRelationship(SARAH, 'p-james', 'friend');
    expect(sentence(withJames, SARAH, names)).toBe("Sarah is James' friend");
  });

  it('relationToMe when self is target', () => {
    const row = buildRelationship(SARAH, ME, 'cousin');
    expect(relationToMe(row, ME)).toBe('Your cousin');
  });

  it('relationToMe when self is source (uses inverse)', () => {
    const row = buildRelationship(ME, SARAH, 'manager');
    expect(relationToMe(row, ME)).toBe('Your direct report');
    const row2 = buildRelationship(SARAH, ME, 'manager');
    expect(relationToMe(row2, ME)).toBe('Your manager');
  });

  it('relationToMe handles custom and unrelated rows', () => {
    const row = buildRelationship(ME, SARAH, 'custom', {
      label: 'Mentor-ish',
      inverseLabel: 'Pal',
    });
    expect(relationToMe(row, ME)).toBe('Your pal');
    expect(relationToMe(row, SARAH)).toBe('Your mentor-ish');
    expect(relationToMe(cousin, ME)).toBeNull();
  });
});

describe('isDuplicate', () => {
  const existing = [buildRelationship(SARAH, MARIA, 'parent')];

  it('detects the same direction', () => {
    expect(isDuplicate(existing, buildRelationship(SARAH, MARIA, 'parent'))).toBe(true);
  });

  it('detects the reverse direction (A parent of B == B child of A)', () => {
    expect(isDuplicate(existing, buildRelationship(MARIA, SARAH, 'child'))).toBe(true);
  });

  it('is false for a different relationship on the same pair', () => {
    expect(isDuplicate(existing, buildRelationship(SARAH, MARIA, 'friend'))).toBe(false);
    expect(isDuplicate(existing, buildRelationship(MARIA, SARAH, 'parent'))).toBe(false);
    expect(isDuplicate(existing, buildRelationship(SARAH, MARIA, 'child'))).toBe(false);
  });

  it('is false for a different pair', () => {
    expect(isDuplicate(existing, buildRelationship(SARAH, ME, 'parent'))).toBe(false);
    expect(isDuplicate(existing, buildRelationship(ME, MARIA, 'parent'))).toBe(false);
    expect(isDuplicate([], buildRelationship(SARAH, MARIA, 'parent'))).toBe(false);
  });

  it('symmetric types duplicate in either direction', () => {
    const rows = [buildRelationship(SARAH, MARIA, 'cousin')];
    expect(isDuplicate(rows, buildRelationship(MARIA, SARAH, 'cousin'))).toBe(true);
  });

  it('custom labels compare per side, case-insensitively', () => {
    const rows = [
      buildRelationship(SARAH, MARIA, 'custom', { label: 'Landlord', inverseLabel: 'Tenant' }),
    ];
    expect(
      isDuplicate(
        rows,
        buildRelationship(MARIA, SARAH, 'custom', { label: 'tenant', inverseLabel: 'landlord' }),
      ),
    ).toBe(true);
    expect(isDuplicate(rows, buildRelationship(SARAH, MARIA, 'custom', { label: 'Rival' }))).toBe(
      false,
    );
    expect(
      isDuplicate(
        rows,
        buildRelationship(SARAH, MARIA, 'custom', { label: 'Tenant', inverseLabel: 'Landlord' }),
      ),
    ).toBe(false);
  });
});
