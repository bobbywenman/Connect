import { daysUntilNext, formatCalendarDate, formatDaysUntil, parseCalendarDate } from './dates';

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15, 30);

describe('daysUntilNext', () => {
  it('is 0 on the day itself, whatever the birth year', () => {
    expect(daysUntilNext('1985-11-06', local(2026, 11, 6))).toBe(0);
  });

  it('counts days later this year', () => {
    expect(daysUntilNext('1985-11-18', local(2026, 11, 6))).toBe(12);
    expect(daysUntilNext('2026-11-07', local(2026, 11, 6))).toBe(1);
  });

  it('rolls over to next year once the date has passed', () => {
    expect(daysUntilNext('1985-11-05', local(2026, 11, 6))).toBe(364);
  });

  it('handles Dec 31 -> Jan 1 and Jan 1 -> Dec 31', () => {
    expect(daysUntilNext('2000-01-01', local(2026, 12, 31))).toBe(1);
    expect(daysUntilNext('2000-12-31', local(2026, 1, 1))).toBe(364);
  });

  it('celebrates Feb 29 on Feb 28 in non-leap years', () => {
    expect(daysUntilNext('2000-02-29', local(2026, 2, 27))).toBe(1);
    expect(daysUntilNext('2000-02-29', local(2026, 2, 28))).toBe(0);
    // Past Feb 28 2026: next is Feb 28 2027, also non-leap.
    expect(daysUntilNext('2000-02-29', local(2026, 3, 1))).toBe(364);
  });

  it('uses Feb 29 itself in leap years', () => {
    expect(daysUntilNext('2000-02-29', local(2028, 2, 28))).toBe(1);
    expect(daysUntilNext('2000-02-29', local(2028, 2, 29))).toBe(0);
    expect(daysUntilNext('2000-02-29', local(2027, 3, 1))).toBe(365);
  });

  it('rolls from a non-leap December into a leap February', () => {
    expect(daysUntilNext('2000-02-29', local(2027, 12, 31))).toBe(60);
  });

  it('ignores the time of day', () => {
    expect(daysUntilNext('1990-06-10', new Date(2026, 5, 9, 23, 59))).toBe(1);
    expect(daysUntilNext('1990-06-10', new Date(2026, 5, 10, 0, 1))).toBe(0);
  });

  it('returns null for invalid input', () => {
    expect(daysUntilNext(null, local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext(undefined, local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext('', local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext('not a date', local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext('2026-02-30', local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext('2026-13-01', local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext('2025-02-29', local(2026, 1, 1))).toBeNull();
    expect(daysUntilNext('2026-11-06', new Date('nope'))).toBeNull();
  });
});

describe('formatDaysUntil', () => {
  it('words the common cases', () => {
    expect(formatDaysUntil(0)).toBe('today');
    expect(formatDaysUntil(1)).toBe('tomorrow');
    expect(formatDaysUntil(12)).toBe('in 12 days');
  });

  it('returns null for missing or invalid values', () => {
    expect(formatDaysUntil(null)).toBeNull();
    expect(formatDaysUntil(undefined)).toBeNull();
    expect(formatDaysUntil(-1)).toBeNull();
    expect(formatDaysUntil(1.5)).toBeNull();
    expect(formatDaysUntil(Number.NaN)).toBeNull();
  });
});

describe('parseCalendarDate / formatCalendarDate', () => {
  it('parses valid dates', () => {
    expect(parseCalendarDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it('formats long dates', () => {
    expect(formatCalendarDate('1985-03-04')).toBe('March 4, 1985');
    expect(formatCalendarDate('1985-3-4')).toBeNull();
    expect(formatCalendarDate(null)).toBeNull();
  });
});
