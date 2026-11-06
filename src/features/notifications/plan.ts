// Pure reminder planning (KT-36). No device or network access: everything the scheduler needs
// to decide what to schedule is computed here from people, settings and "now", so it is easy to test.
import { parseCalendarDate } from '@/features/people/dates';
import type { Database } from '@/types/database';

type Person = Database['public']['Tables']['persons']['Row'];

/** The person columns planning reads. */
export type ReminderPerson = Pick<
  Person,
  | 'id'
  | 'first_name'
  | 'preferred_name'
  | 'birthdate'
  | 'birthday_reminder'
  | 'anniversary_date'
  | 'anniversary_reminder'
  | 'archived_at'
  | 'is_self'
>;

export type ReminderKind = 'birthday' | 'anniversary';

export interface ReminderSettings {
  birthdays: boolean;
  anniversaries: boolean;
  /** Days before the date to remind (0 = on the day). */
  leadDays: number;
  /** Local hour of day, 0-23. */
  hour: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  birthdays: true,
  anniversaries: true,
  leadDays: 0,
  hour: 9,
};

export const MAX_LEAD_DAYS = 30;

/** iOS keeps at most 64 pending local notifications; stay under it with headroom. */
export const MAX_SCHEDULED = 60;

export interface PlannedReminder {
  personId: string;
  kind: ReminderKind;
  fireAt: Date;
  title: string;
  body: string;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Reads `profiles.settings.reminders` (KT-37 writes it); anything missing or malformed gets the default. */
export function parseReminderSettings(settings: unknown): ReminderSettings {
  const raw =
    settings && typeof settings === 'object' && 'reminders' in settings
      ? (settings as { reminders: unknown }).reminders
      : null;
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_REMINDER_SETTINGS;
  return {
    birthdays: typeof r.birthdays === 'boolean' ? r.birthdays : d.birthdays,
    anniversaries: typeof r.anniversaries === 'boolean' ? r.anniversaries : d.anniversaries,
    leadDays: clampInt(r.leadDays, 0, MAX_LEAD_DAYS, d.leadDays),
    hour: clampInt(r.hour, 0, 23, d.hour),
  };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** When to fire for the occurrence in `year`, in the device's local time. */
function fireTimeFor(
  date: { month: number; day: number },
  year: number,
  settings: ReminderSettings,
): Date {
  // Feb 29 is celebrated on Feb 28 in non-leap years (same rule as daysUntilNext).
  const day = date.month === 2 && date.day === 29 && !isLeapYear(year) ? 28 : date.day;
  // Date normalises a day-of-month below 1 into the previous month/year (lead across New Year).
  return new Date(year, date.month - 1, day - settings.leadDays, settings.hour, 0, 0, 0);
}

/** First fire time strictly after `now` for a month/day. */
function nextFireTime(
  date: { month: number; day: number },
  now: Date,
  settings: ReminderSettings,
): Date {
  // Lead days can pull this year's fire time before now, so look up to two years ahead.
  for (let year = now.getFullYear(); year <= now.getFullYear() + 2; year++) {
    const fireAt = fireTimeFor(date, year, settings);
    if (fireAt.getTime() > now.getTime()) return fireAt;
  }
  return fireTimeFor(date, now.getFullYear() + 2, settings);
}

/** "today", "tomorrow", "in 3 days", "in 1 week", "in 2 weeks". */
export function describeLead(leadDays: number): string {
  if (leadDays <= 0) return 'today';
  if (leadDays === 1) return 'tomorrow';
  if (leadDays % 7 === 0) {
    const weeks = leadDays / 7;
    return `in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  return `in ${leadDays} days`;
}

export function reminderBody(name: string, kind: ReminderKind, leadDays: number): string {
  return `${name}'s ${kind} is ${describeLead(leadDays)}${leadDays <= 0 ? '!' : ''}`;
}

/**
 * The next notification for every enabled birthday/anniversary, soonest first, capped at
 * MAX_SCHEDULED. Archived people and the self person ("You") are skipped. Only the next
 * occurrence is planned; the app re-plans on launch, foreground and after edits.
 */
export function planReminders(
  people: readonly ReminderPerson[],
  settings: ReminderSettings,
  now: Date,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  const add = (
    person: ReminderPerson,
    kind: ReminderKind,
    value: string | null,
    enabled: boolean,
  ) => {
    const date = parseCalendarDate(value);
    if (!enabled || !date) return;
    const name = person.preferred_name?.trim() || person.first_name;
    planned.push({
      personId: person.id,
      kind,
      fireAt: nextFireTime(date, now, settings),
      title: kind === 'birthday' ? 'Birthday' : 'Anniversary',
      body: reminderBody(name, kind, settings.leadDays),
    });
  };

  for (const person of people) {
    if (person.archived_at || person.is_self) continue;
    add(person, 'birthday', person.birthdate, settings.birthdays && person.birthday_reminder);
    add(
      person,
      'anniversary',
      person.anniversary_date,
      settings.anniversaries && person.anniversary_reminder,
    );
  }

  return planned
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.personId.localeCompare(b.personId))
    .slice(0, MAX_SCHEDULED);
}
