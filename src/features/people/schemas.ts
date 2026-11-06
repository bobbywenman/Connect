import { z } from 'zod';

export const FIRST_NAME_MAX = 50;
export const TAG_MAX = 30;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as `YYYY-MM-DD` (rejects 2024-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Format a Date's local calendar day as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Trim, drop empties, and de-duplicate case-insensitively (first spelling wins).
 * Used by the chip input and by the schema, so both agree.
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || isValidIsoDate(v), `${label} must be a date like 1990-04-23`)
    .transform((v) => (v === '' ? null : v));

/**
 * Validation for the add/edit person form. Input is the form's raw strings; output
 * is what gets saved (empty strings become null, tags are cleaned).
 *
 * `isSelf`: the self person belongs to every network implicitly (D-2), so it has no
 * network picker and needs no network.
 *
 * Birthdays always include a year for now; year-optional birthdays are a later change.
 */
export function createPersonFormSchema({ isSelf = false }: { isSelf?: boolean } = {}) {
  return (
    z
      .object({
        firstName: z
          .string()
          .trim()
          .min(1, 'First name is required')
          .max(FIRST_NAME_MAX, `First name must be ${FIRST_NAME_MAX} characters or fewer`),
        lastName: optionalText(100, 'Last name'),
        preferredName: optionalText(100, 'Nickname'),
        networkIds: z.array(z.string()),
        pronouns: optionalText(50, 'Pronouns'),
        birthdate: optionalDate('Birthday'),
        birthdayReminder: z.boolean(),
        anniversaryDate: optionalDate('Anniversary'),
        anniversaryReminder: z.boolean(),
        locationCity: optionalText(200, 'City'),
        jobTitle: optionalText(200, 'Job title'),
        company: optionalText(200, 'Company'),
        department: optionalText(200, 'Department'),
        notes: optionalText(10000, 'Notes'),
        tags: z
          .array(z.string().trim().max(TAG_MAX, `Tags must be ${TAG_MAX} characters or fewer`))
          .transform(normalizeTags),
        funFacts: optionalText(10000, 'Fun facts'),
        conversationStarters: optionalText(10000, 'Conversation starters'),
      })
      .superRefine((value, ctx) => {
        if (!isSelf && value.networkIds.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['networkIds'],
            message: 'Pick at least one network',
          });
        }
      })
      // A reminder with no date to remind about is meaningless; store it off.
      .transform((v) => ({
        ...v,
        birthdayReminder: v.birthdayReminder && v.birthdate !== null,
        anniversaryReminder: v.anniversaryReminder && v.anniversaryDate !== null,
      }))
  );
}

export type PersonFormInput = z.input<ReturnType<typeof createPersonFormSchema>>;
export type PersonFormValues = z.output<ReturnType<typeof createPersonFormSchema>>;

export const emptyPersonForm: PersonFormInput = {
  firstName: '',
  lastName: '',
  preferredName: '',
  networkIds: [],
  pronouns: '',
  birthdate: '',
  birthdayReminder: false,
  anniversaryDate: '',
  anniversaryReminder: false,
  locationCity: '',
  jobTitle: '',
  company: '',
  department: '',
  notes: '',
  tags: [],
  funFacts: '',
  conversationStarters: '',
};
