import {
  checkImportBatch,
  describeMatches,
  findAllDuplicatePairs,
  findDuplicatesFor,
  normalizeName,
  orderedPair,
  type DuplicateCandidate,
  type DuplicatePerson,
} from './duplicates';

let n = 0;
function person(
  first: string,
  last: string | null = null,
  extra: Partial<DuplicatePerson> = {},
): DuplicatePerson {
  n += 1;
  return {
    id: `p${n}`,
    first_name: first,
    last_name: last,
    preferred_name: null,
    is_self: false,
    networkIds: ['n1'],
    ...extra,
  };
}
/** A not-yet-saved person (no id). */
function cand(
  first: string,
  last: string | null = null,
  extra: Partial<DuplicateCandidate> = {},
): DuplicateCandidate {
  return {
    first_name: first,
    last_name: last,
    preferred_name: null,
    is_self: false,
    networkIds: ['n1'],
    ...extra,
  };
}

describe('normalizeName', () => {
  it('trims, lowercases, strips accents and collapses spaces', () => {
    expect(normalizeName('  JOSÉ   María ')).toBe('jose maria');
    expect(normalizeName('Zoë')).toBe('zoe');
    expect(normalizeName(null)).toBe('');
  });
});

describe('orderedPair', () => {
  it('orders ids so (a,b) and (b,a) are the same', () => {
    expect(orderedPair('b', 'a')).toEqual(['a', 'b']);
    expect(orderedPair('a', 'b')).toEqual(['a', 'b']);
  });
});

describe('findDuplicatesFor', () => {
  it('flags the same name in any network', () => {
    const existing = person('Robert', 'Wenman', { networkIds: ['family'] });
    const res = findDuplicatesFor(cand('Robert', 'Wenman', { networkIds: ['work'] }), [existing]);
    expect(res).toEqual([{ person: existing, confidence: 'likely' }]);
  });

  it('ignores case, accents, extra spaces', () => {
    const existing = person('José', 'García');
    expect(findDuplicatesFor(cand('  jose ', 'GARCIA  '), [existing])).toHaveLength(1);
  });

  it('does not flag same first name with a different last name', () => {
    expect(findDuplicatesFor(cand('Robert', 'Smith'), [person('Robert', 'Wenman')])).toEqual([]);
  });

  it('does not flag same last name with a different first name', () => {
    expect(findDuplicatesFor(cand('Anna', 'Wenman'), [person('Robert', 'Wenman')])).toEqual([]);
  });

  it('treats the preferred name as an alternative first name', () => {
    const existing = person('Robert', 'Wenman', { preferred_name: 'Bob' });
    expect(findDuplicatesFor(cand('Bob', 'Wenman'), [existing])).toHaveLength(1);
    const bob = person('Bob', 'Wenman');
    const withPreferred = cand('Robert', 'Wenman', { preferred_name: 'Bob' });
    expect(findDuplicatesFor(withPreferred, [bob])).toHaveLength(1);
  });

  it('reads a bracketed nickname in the first name', () => {
    const existing = person('Robert (Bob)', 'Wenman');
    expect(findDuplicatesFor(cand('Bob', 'Wenman'), [existing])).toHaveLength(1);
    expect(findDuplicatesFor(cand('Robert', 'Wenman'), [existing])).toHaveLength(1);
  });

  it('does not match on the preferred name alone when last names differ', () => {
    const existing = person('Robert', 'Wenman', { preferred_name: 'Bob' });
    expect(findDuplicatesFor(cand('Bob', 'Jones'), [existing])).toEqual([]);
  });

  it('never pairs the self person, from either side', () => {
    const me = person('Robert', 'Wenman', { is_self: true });
    expect(findDuplicatesFor(cand('Robert', 'Wenman'), [me])).toEqual([]);
    const asSelf = cand('Robert', 'Wenman', { is_self: true });
    expect(findDuplicatesFor(asSelf, [person('Robert', 'Wenman')])).toEqual([]);
  });

  it('skips the person being edited', () => {
    const existing = person('Robert', 'Wenman');
    expect(findDuplicatesFor({ ...existing }, [existing])).toEqual([]);
  });

  it('skips dismissed pairs in either argument order', () => {
    const a = person('Robert', 'Wenman');
    const b = person('Robert', 'Wenman');
    const [x, y] = orderedPair(a.id, b.id);
    const dismissals = [{ person_a_id: x, person_b_id: y }];
    expect(findDuplicatesFor(a, [b], dismissals)).toEqual([]);
    expect(findDuplicatesFor(b, [a], dismissals)).toEqual([]);
    expect(findDuplicatesFor(a, [b], [])).toHaveLength(1);
  });

  it('matches first-name-only people only when both lack a last name and share a network', () => {
    const solo = person('Sam', null, { networkIds: ['n1'] });
    expect(findDuplicatesFor(cand('Sam', null, { networkIds: ['n1'] }), [solo])).toEqual([
      { person: solo, confidence: 'possible' },
    ]);
    expect(findDuplicatesFor(cand('Sam', null, { networkIds: ['n2'] }), [solo])).toEqual([]);
    expect(findDuplicatesFor(cand('Sam', 'Lee', { networkIds: ['n1'] }), [solo])).toEqual([]);
    expect(findDuplicatesFor(cand('Sam', null), [person('Sam', 'Lee')])).toEqual([]);
  });

  it('treats a blank last name as missing', () => {
    expect(findDuplicatesFor(cand('Sam', ''), [person('Sam', '   ')])).toHaveLength(1);
  });

  it('lists likely matches before possible ones', () => {
    const likely = person('Sam', 'Lee');
    const res = findDuplicatesFor(cand('Sam', 'Lee'), [person('Sam'), likely]);
    expect(res.map((r) => r.person)).toEqual([likely]);
  });
});

describe('findAllDuplicatePairs', () => {
  it('finds each pair once, likely first', () => {
    const a = person('Robert', 'Wenman', { networkIds: ['family'] });
    const b = person('Robert', 'Wenman', { networkIds: ['work'] });
    const c = person('Sam');
    const d = person('Sam');
    const e = person('Robert', 'Smith');
    expect(findAllDuplicatePairs([c, a, d, b, e])).toEqual([
      { a, b, confidence: 'likely' },
      { a: c, b: d, confidence: 'possible' },
    ]);
  });

  it('drops dismissed pairs and the self person', () => {
    const a = person('Robert', 'Wenman');
    const b = person('Robert', 'Wenman');
    const me = person('Robert', 'Wenman', { is_self: true });
    expect(findAllDuplicatePairs([a, b, me])).toHaveLength(1);
    const [x, y] = orderedPair(b.id, a.id);
    expect(findAllDuplicatePairs([a, b, me], [{ person_a_id: x, person_b_id: y }])).toEqual([]);
  });

  it('finds all pairs in a group of three', () => {
    const people = [person('Al', 'Kay'), person('Al', 'Kay'), person('al', 'kay')];
    expect(findAllDuplicatePairs(people)).toHaveLength(3);
  });
});

describe('checkImportBatch', () => {
  it('returns matches per candidate, in order', () => {
    const existing = person('Robert', 'Wenman');
    const batch = [cand('Robert', 'Wenman'), cand('Ana', 'Diaz')];
    const res = checkImportBatch(batch, [existing]);
    expect(res.map((r) => r.candidate)).toEqual(batch);
    expect(res[0]!.matches.map((m) => m.person)).toEqual([existing]);
    expect(res[1]!.matches).toEqual([]);
  });

  it('catches repeats inside the batch on the later candidate', () => {
    const res = checkImportBatch<DuplicateCandidate, DuplicatePerson>(
      [cand('Ana', 'Diaz'), cand('Ana', 'Diaz')],
      [],
    );
    expect(res[0]!.matches).toEqual([]);
    expect(res[1]!.matches.map((m) => m.person.id)).toEqual(['batch:0']);
  });

  it('honours dismissals for candidates with ids', () => {
    const existing = person('Robert', 'Wenman');
    const withId = { ...cand('Robert', 'Wenman'), id: 'zzz' };
    const [x, y] = orderedPair('zzz', existing.id);
    const res = checkImportBatch([withId], [existing], [{ person_a_id: x, person_b_id: y }]);
    expect(res[0]!.matches).toEqual([]);
  });
});

describe('describeMatches', () => {
  const names = new Map([
    ['n1', 'Wenman Family'],
    ['n2', 'Work'],
  ]);

  it('names the person and network', () => {
    const p = person('Robert', 'Wenman', { networkIds: ['n1'] });
    expect(describeMatches([{ person: p, confidence: 'likely' }], names)).toBe(
      'Robert Wenman is already in Wenman Family.',
    );
  });

  it('joins networks, falls back when none, counts extras', () => {
    const p = person('Robert', 'Wenman', { networkIds: ['n1', 'n2'] });
    const q = person('Robert', 'Wenman', { networkIds: [] });
    expect(describeMatches([{ person: p, confidence: 'likely' }], names)).toContain(
      'Wenman Family and Work',
    );
    expect(describeMatches([{ person: q, confidence: 'likely' }], names)).toContain('your people');
    const both = [
      { person: p, confidence: 'likely' as const },
      { person: q, confidence: 'likely' as const },
    ];
    expect(describeMatches(both, names)).toContain('(and 1 more similar person)');
    expect(describeMatches([], names)).toBe('');
  });
});
