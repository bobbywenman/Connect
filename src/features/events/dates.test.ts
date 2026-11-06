import { daysBetween, formatEventDate, formatRelativeDay, todayIso } from './dates';

describe('todayIso', () => {
  it('uses the local calendar day', () => {
    expect(todayIso(new Date(2026, 11, 5, 23, 59))).toBe('2026-12-05');
    expect(todayIso(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('daysBetween', () => {
  it('counts calendar days, positive going forward', () => {
    expect(daysBetween('2026-12-14', '2026-12-20')).toBe(6);
    expect(daysBetween('2026-12-20', '2026-12-14')).toBe(-6);
    expect(daysBetween('2026-12-20', '2026-12-20')).toBe(0);
  });
  it('is not thrown off by daylight saving changes', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });
  it('crosses year boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('formatRelativeDay', () => {
  const today = '2026-12-14';
  const cases: [string, string][] = [
    ['2026-12-14', 'today'],
    ['2026-12-15', 'tomorrow'],
    ['2026-12-13', 'yesterday'],
    ['2026-12-20', 'in 6 days'],
    ['2026-12-08', '6 days ago'],
    ['2026-12-27', 'in 13 days'],
    ['2026-12-28', 'in 2 weeks'],
    ['2027-01-04', 'in 3 weeks'],
    ['2026-11-23', '3 weeks ago'],
    ['2027-02-11', 'in 8 weeks'],
    ['2027-02-12', 'in 2 months'],
    ['2026-09-14', '3 months ago'],
    ['2028-12-14', 'in 2 years'],
    ['2025-06-14', '18 months ago'],
    ['2023-12-14', '3 years ago'],
  ];
  it.each(cases)('%s is %s', (date, expected) => {
    expect(formatRelativeDay(date, today)).toBe(expected);
  });
});

describe('formatEventDate', () => {
  it('formats as weekday, month and day', () => {
    expect(formatEventDate('2026-12-20', '2026-11-06')).toBe('Sun, Dec 20');
    expect(formatEventDate('2026-11-26', '2026-11-06')).toBe('Thu, Nov 26');
  });
  it('adds the year when it is not the current year', () => {
    expect(formatEventDate('2027-01-03', '2026-11-06')).toBe('Sun, Jan 3, 2027');
  });
  it('returns unparseable text unchanged', () => {
    expect(formatEventDate('soon', '2026-11-06')).toBe('soon');
  });
});
