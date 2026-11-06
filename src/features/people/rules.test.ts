import { canDeletePerson } from './rules';

describe('canDeletePerson', () => {
  it('allows deleting an ordinary person', () => {
    expect(canDeletePerson({ is_self: false })).toBe(true);
  });

  it('never allows deleting the self person (D-2)', () => {
    expect(canDeletePerson({ is_self: true })).toBe(false);
  });
});
