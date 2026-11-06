import { formatAddedDate, newPersonLabel, startOfMonth } from './newThisMonth';

describe('startOfMonth', () => {
  it('is midnight on the 1st of the same local month', () => {
    expect(startOfMonth(new Date(2026, 10, 15, 13, 45))).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0));
  });

  it('is the 1st itself when called on the 1st', () => {
    expect(startOfMonth(new Date(2026, 10, 1, 23, 59))).toEqual(new Date(2026, 10, 1));
  });

  it('handles January, the first month of the year', () => {
    expect(startOfMonth(new Date(2026, 0, 20))).toEqual(new Date(2026, 0, 1));
  });

  it('handles December, the last month of the year', () => {
    expect(startOfMonth(new Date(2026, 11, 31, 23, 59))).toEqual(new Date(2026, 11, 1));
  });

  it('lands on local midnight in months that contain a daylight-saving change', () => {
    // March and November contain the DST switch in most zones; the start is local midnight regardless.
    const march = startOfMonth(new Date(2026, 2, 20, 12));
    expect(march).toEqual(new Date(2026, 2, 1));
    expect(march.getHours()).toBe(0);
    const november = startOfMonth(new Date(2026, 10, 20, 12));
    expect(november).toEqual(new Date(2026, 10, 1));
    expect(november.getHours()).toBe(0);
  });

  it('does not change the date it was given', () => {
    const now = new Date(2026, 10, 15, 9);
    startOfMonth(now);
    expect(now).toEqual(new Date(2026, 10, 15, 9));
  });
});

describe('formatAddedDate', () => {
  it('formats the local day as "Mon D"', () => {
    expect(formatAddedDate(new Date(2026, 10, 3, 12).toISOString())).toBe('Nov 3');
    expect(formatAddedDate(new Date(2026, 0, 31, 12).toISOString())).toBe('Jan 31');
    expect(formatAddedDate(new Date(2026, 11, 25, 12).toISOString())).toBe('Dec 25');
  });
});

describe('newPersonLabel', () => {
  const created = new Date(2026, 10, 3, 12).toISOString();

  it('lists networks before the date', () => {
    expect(newPersonLabel(['Family', 'Book club'], created)).toBe(
      'Family, Book club · Added Nov 3',
    );
  });

  it('shows only the date when the person is in no network', () => {
    expect(newPersonLabel([], created)).toBe('Added Nov 3');
  });
});
