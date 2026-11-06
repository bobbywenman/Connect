import { isValidIsoDate, toIsoDate } from '@/features/people/schemas';

/** Today's local calendar day as `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

const MS_PER_DAY = 86_400_000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `from` to `to` (both `YYYY-MM-DD`). Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / MS_PER_DAY);
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/**
 * Relative phrase for an event day: "today", "tomorrow", "in 6 days", "in 3 weeks",
 * "yesterday", "3 weeks ago", "2 months ago", "3 years ago". Days up to 13, then weeks up to
 * 8, then months up to 23, then years. Calendar-day based, so the time of day never matters.
 */
export function formatRelativeDay(eventDate: string, today: string): string {
  const diff = daysBetween(today, eventDate);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  const abs = Math.abs(diff);
  let phrase: string;
  if (abs < 14) phrase = plural(abs, 'day');
  else if (abs < 60) phrase = plural(Math.floor(abs / 7), 'week');
  else if (abs < 730) phrase = plural(Math.floor(abs / 30), 'month');
  else phrase = plural(Math.floor(abs / 365), 'year');
  return diff > 0 ? `in ${phrase}` : `${phrase} ago`;
}

/**
 * "Sat, Dec 20" (the year is added when it differs from today's, e.g. "Mon, Jan 3, 2028").
 * Falls back to the raw text when it is not a real date.
 */
export function formatEventDate(eventDate: string, today: string): string {
  if (!isValidIsoDate(eventDate)) return eventDate;
  const [y, m, d] = eventDate.split('-').map(Number) as [number, number, number];
  const sameYear = eventDate.slice(0, 4) === today.slice(0, 4);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
