import { networkColors } from '@/constants';

import { formatPersonCount, networkTypeLabel, resolveNetworkColor } from './colors';

describe('resolveNetworkColor', () => {
  it('maps every palette name to its value', () => {
    for (const c of networkColors) expect(resolveNetworkColor(c.name)).toBe(c.value);
  });

  it('falls back to gray for unknown, empty or missing names', () => {
    const gray = networkColors.find((c) => c.name === 'gray')?.value;
    expect(resolveNetworkColor('chartreuse')).toBe(gray);
    expect(resolveNetworkColor('')).toBe(gray);
    expect(resolveNetworkColor(null)).toBe(gray);
    expect(resolveNetworkColor(undefined)).toBe(gray);
  });
});

describe('networkTypeLabel', () => {
  it('labels known types', () => {
    expect(networkTypeLabel('family')).toBe('Family');
    expect(networkTypeLabel('friends')).toBe('Friends');
    expect(networkTypeLabel('work')).toBe('Work');
    expect(networkTypeLabel('custom')).toBe('Custom');
  });

  it('capitalises unknown types', () => {
    expect(networkTypeLabel('club')).toBe('Club');
  });
});

describe('formatPersonCount', () => {
  it('uses singular and plural', () => {
    expect(formatPersonCount(0)).toBe('0 people');
    expect(formatPersonCount(1)).toBe('1 person');
    expect(formatPersonCount(8)).toBe('8 people');
  });
});
