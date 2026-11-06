import { networkColors } from '@/constants';

import { networkFormSchema, networkTypes, validateNetworkForm } from './schemas';

const valid = { name: 'Book Club', type: 'friends', color: 'teal' };

describe('networkFormSchema', () => {
  it('accepts valid values and trims the name', () => {
    const result = networkFormSchema.parse({ ...valid, name: '  Book Club  ' });
    expect(result).toEqual(valid);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateNetworkForm({ ...valid, name: '' }).name).toBe('Enter a name for this network');
    expect(validateNetworkForm({ ...valid, name: '   ' }).name).toBe(
      'Enter a name for this network',
    );
  });

  it('allows exactly 50 characters and rejects 51', () => {
    expect(validateNetworkForm({ ...valid, name: 'a'.repeat(50) })).toEqual({});
    expect(validateNetworkForm({ ...valid, name: 'a'.repeat(51) }).name).toBe(
      'Use 50 characters or fewer',
    );
  });

  it('accepts every type and every palette color', () => {
    for (const type of networkTypes) expect(validateNetworkForm({ ...valid, type })).toEqual({});
    for (const c of networkColors) {
      expect(validateNetworkForm({ ...valid, color: c.name })).toEqual({});
    }
  });

  it('rejects unknown types and colors', () => {
    expect(validateNetworkForm({ ...valid, type: 'team' }).type).toBeDefined();
    expect(validateNetworkForm({ ...valid, color: 'magenta' }).color).toBeDefined();
  });
});
