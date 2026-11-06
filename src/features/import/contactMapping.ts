// Pure mapping from a phone contact to an import candidate (KT-31). No I/O.
//
// expo-contacts (SDK 58 class API, `Contact.getAllDetails`) reports birthdays as
// `{ year?, month, day }` with month 1-12 (the old `expo-contacts/legacy` API used 0-11,
// which is NOT what this app calls). A birthday without a year is not storable yet
// (see schemas.ts), so it becomes null and the candidate is flagged `birthdayWithoutYear`.
import type { PersonFields } from '@/features/people/api';
import { isValidIsoDate } from '@/features/people/schemas';

import type { ImportCandidate } from './types';

export interface ContactDateLike {
  year?: number | null;
  month: number;
  day: number;
}

/** The subset of an expo-contacts record we read. Everything is optional: address books are messy. */
export interface ContactLike {
  id: string;
  givenName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
  fullName?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  department?: string | null;
  addresses?: readonly { city?: string | null }[] | null;
  birthday?: ContactDateLike | null;
  /** Android keeps birthdays in the generic dates list. */
  dates?: readonly { label?: string | null; date?: ContactDateLike | null }[] | null;
}

/** Column limits from the person form schema, so imported rows can be edited later. */
const LIMITS = {
  first: 50,
  last: 100,
  preferred: 100,
  city: 200,
  job: 200,
  company: 200,
  dept: 200,
};

/** Apple used year 1604 as a placeholder for "no year" in old data. Nothing before 1900 is a real birthday here. */
const MIN_YEAR = 1900;

function clean(value: string | null | undefined, max: number): string | null {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

/** Given/family name, or the full name split on the first space when the parts are missing. */
function splitName(contact: ContactLike): { first: string | null; last: string | null } {
  const given = clean(contact.givenName, LIMITS.first);
  const family = clean(contact.familyName, LIMITS.last);
  if (given) return { first: given, last: family };

  const full = clean(contact.fullName, 200);
  if (!full) return { first: null, last: null };
  // iOS reports an organisation-only contact's company as its full name; that is not a person.
  const company = clean(contact.company, 200);
  if (!family && company && full.toLowerCase() === company.toLowerCase()) {
    return { first: null, last: null };
  }
  const space = full.indexOf(' ');
  if (space === -1) return { first: full.slice(0, LIMITS.first), last: family };
  return {
    first: full.slice(0, space).slice(0, LIMITS.first),
    last: family ?? clean(full.slice(space + 1), LIMITS.last),
  };
}

function birthdayOf(contact: ContactLike): ContactDateLike | null {
  if (contact.birthday) return contact.birthday;
  const dated = contact.dates?.find((d) => /birth/i.test(d.label ?? '') && d.date);
  return dated?.date ?? null;
}

/**
 * `YYYY-MM-DD` for a birthday with a real year, otherwise null. `hadBirthday` tells the caller
 * a birthday existed but could not be stored.
 */
export function mapBirthday(contact: ContactLike): {
  birthdate: string | null;
  hadBirthday: boolean;
} {
  const b = birthdayOf(contact);
  if (!b || !Number.isInteger(b.month) || !Number.isInteger(b.day)) {
    return { birthdate: null, hadBirthday: false };
  }
  const year = b.year ?? null;
  if (year === null || !Number.isInteger(year) || year < MIN_YEAR) {
    return { birthdate: null, hadBirthday: true };
  }
  const iso = `${String(year).padStart(4, '0')}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
  if (!isValidIsoDate(iso) || new Date(iso).getTime() > Date.now()) {
    return { birthdate: null, hadBirthday: true };
  }
  return { birthdate: iso, hadBirthday: false };
}

/** Map one contact, or null when there is no usable first name. */
export function contactToCandidate(contact: ContactLike): ImportCandidate | null {
  const { first, last } = splitName(contact);
  if (!first || !contact.id) return null;

  const nickname = clean(contact.nickname, LIMITS.preferred);
  const city =
    (contact.addresses ?? []).map((a) => clean(a.city, LIMITS.city)).find(Boolean) ?? null;
  const { birthdate, hadBirthday } = mapBirthday(contact);

  const fields: PersonFields = {
    firstName: first,
    lastName: last,
    preferredName: nickname && nickname.toLowerCase() !== first.toLowerCase() ? nickname : null,
    pronouns: null,
    birthdate,
    birthdayReminder: false,
    anniversaryDate: null,
    anniversaryReminder: false,
    locationCity: city,
    jobTitle: clean(contact.jobTitle, LIMITS.job),
    company: clean(contact.company, LIMITS.company),
    department: clean(contact.department, LIMITS.dept),
    notes: null,
    tags: [],
    funFacts: null,
    conversationStarters: null,
  };
  return {
    key: contact.id,
    fields,
    source: { importSource: 'contacts', externalIds: { contacts: contact.id } },
    photoRef: contact.id,
    birthdayWithoutYear: hadBirthday && birthdate === null,
  };
}

/** Map many contacts, dropping unusable ones and repeated ids. */
export function contactsToCandidates(contacts: readonly ContactLike[]): ImportCandidate[] {
  const seen = new Set<string>();
  const result: ImportCandidate[] = [];
  for (const contact of contacts) {
    const candidate = contactToCandidate(contact);
    if (!candidate || seen.has(candidate.key)) continue;
    seen.add(candidate.key);
    result.push(candidate);
  }
  return result;
}
