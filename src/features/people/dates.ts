// Pure date helpers for the person detail screen (KT-17). Dates are calendar dates
// ("YYYY-MM-DD", as stored in `date` columns), never instants, so no time zones are involved:
// "today" is the viewer's local calendar day, passed in so tests can fix it.

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DAY_MS = 86_400_000;

export interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Parse a strict "YYYY-MM-DD" string; null for anything else, including impossible dates. */
export function parseCalendarDate(value: string | null | undefined): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function utcDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/**
 * Whole days from `today` until the next occurrence of this date's month and day (0 when it
 * is today). A Feb 29 date is celebrated on Feb 28 in non-leap years. Returns null for an
 * invalid date string or an invalid `today`.
 */
export function daysUntilNext(date: string | null | undefined, today: Date): number | null {
  const parsed = parseCalendarDate(date);
  if (!parsed || Number.isNaN(today.getTime())) return null;
  const todayDay = utcDay(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const occurrence = (year: number) => {
    const day = parsed.month === 2 && parsed.day === 29 && !isLeapYear(year) ? 28 : parsed.day;
    return utcDay(year, parsed.month, day);
  };
  let next = occurrence(today.getFullYear());
  if (next < todayDay) next = occurrence(today.getFullYear() + 1);
  return next - todayDay;
}

/** "today", "tomorrow", "in 12 days"; null when there is nothing to say. */
export function formatDaysUntil(days: number | null | undefined): string | null {
  if (days === null || days === undefined || !Number.isInteger(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** "March 4, 1985"; null for an invalid date. */
export function formatCalendarDate(date: string | null | undefined): string | null {
  const parsed = parseCalendarDate(date);
  if (!parsed) return null;
  return `${MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}
