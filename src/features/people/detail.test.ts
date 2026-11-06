import { buildRelationship } from '@/features/relationships';

import type { ConnectionPerson, PersonConnection } from './api';
import {
  connectionLabel,
  nameParts,
  photoCacheKey,
  relationshipBadges,
  sortConnections,
  textOrNull,
} from './detail';

function other(id: string, first: string, extra: Partial<ConnectionPerson> = {}): ConnectionPerson {
  return {
    id,
    first_name: first,
    last_name: null,
    preferred_name: null,
    photo_path: null,
    updated_at: 'u',
    is_self: false,
    archived_at: null,
    job_title: null,
    tags: [],
    ...extra,
  };
}

function conn(
  id: string,
  source: string,
  target: string,
  type: Parameters<typeof buildRelationship>[2],
  person: ConnectionPerson,
  custom?: Parameters<typeof buildRelationship>[3],
): PersonConnection {
  return { relationship: { id, ...buildRelationship(source, target, type, custom) }, person };
}

const robert = { id: 'rob', first_name: 'Robert', preferred_name: 'Bob', is_self: false };

describe('nameParts', () => {
  it('splits a different nickname from the name', () => {
    expect(nameParts({ first_name: 'Robert', last_name: 'Wenman', preferred_name: 'Bob' })).toEqual(
      { name: 'Robert Wenman', nickname: 'Bob' },
    );
  });

  it('drops a nickname equal to the first name, and a missing last name', () => {
    expect(nameParts({ first_name: 'Sam', last_name: null, preferred_name: ' sam ' })).toEqual({
      name: 'Sam',
      nickname: null,
    });
  });
});

describe('textOrNull', () => {
  it('hides blank text', () => {
    expect(textOrNull('  ')).toBeNull();
    expect(textOrNull(null)).toBeNull();
    expect(textOrNull(' hi ')).toBe('hi');
  });
});

describe('relationshipBadges', () => {
  it('words badges from the person side, and "Your ..." when the other end is you', () => {
    const badges = relationshipBadges({ id: 'rob', is_self: false }, [
      conn('r1', 'rob', 'mia', 'cousin', other('mia', 'Maria')),
      conn('r2', 'me', 'rob', 'child', other('me', 'Alex', { is_self: true })),
    ]);
    expect(badges).toEqual([
      { id: 'r1', label: 'Cousin of Maria' },
      { id: 'r2', label: 'Your parent' },
    ]);
  });

  it('has none on the self person page', () => {
    expect(
      relationshipBadges({ id: 'me', is_self: true }, [
        conn('r2', 'me', 'rob', 'child', other('rob', 'Robert')),
      ]),
    ).toEqual([]);
  });
});

describe('connectionLabel', () => {
  it('says what the connection is to the page person', () => {
    // rob is parent of mia, so mia is rob's child.
    const c = conn('r1', 'rob', 'mia', 'parent', other('mia', 'Maria'));
    expect(connectionLabel(robert, c)).toBe("Bob's child");
    expect(connectionLabel({ ...robert, is_self: true }, c)).toBe('Your child');
  });

  it('keeps custom wording as typed and handles names ending in s', () => {
    const c = conn('r1', 'rob', 'mia', 'custom', other('mia', 'Maria'), {
      label: 'Landlord',
      inverseLabel: 'Tenant',
    });
    expect(connectionLabel({ ...robert, first_name: 'Chris', preferred_name: null }, c)).toBe(
      "Chris' Tenant",
    );
  });
});

describe('sortConnections', () => {
  it('puts You first, then A-Z', () => {
    const list = [
      conn('r1', 'rob', 'z', 'friend', other('z', 'Zed')),
      conn('r2', 'rob', 'me', 'friend', other('me', 'Alex', { is_self: true })),
      conn('r3', 'rob', 'a', 'friend', other('a', 'Ann')),
    ];
    expect(sortConnections(list).map((c) => c.person.id)).toEqual(['me', 'a', 'z']);
  });
});

describe('photoCacheKey', () => {
  it('is undefined without a photo and versioned with one', () => {
    expect(photoCacheKey({ photo_path: null, updated_at: 'x' })).toBeUndefined();
    expect(photoCacheKey({ photo_path: 'a/b.jpg', updated_at: 'x' })).toBe('a/b.jpg?v=x');
  });
});
