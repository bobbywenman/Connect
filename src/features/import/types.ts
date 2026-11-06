import type { PersonFields, PersonSource } from '@/features/people/api';

/**
 * One person found in an import source (phone contacts now, a LinkedIn CSV in KT-32),
 * already mapped to what we store. Everything after this point (review, duplicate
 * checks, importing) works on candidates and does not care where they came from.
 */
export interface ImportCandidate {
  /** Unique within one import list (the contact id, or a CSV row key). */
  key: string;
  fields: PersonFields;
  source: PersonSource;
  /** Source-specific handle used to fetch a photo on demand (the contact id). */
  photoRef?: string;
  /** The source had a birthday, but no year, which we cannot store yet. */
  birthdayWithoutYear?: boolean;
}

export function candidateName(candidate: Pick<ImportCandidate, 'fields'>): string {
  return [candidate.fields.firstName, candidate.fields.lastName].filter(Boolean).join(' ');
}

/** "Designer · Acme" style second line, or null. */
export function candidateSubtitle(candidate: Pick<ImportCandidate, 'fields'>): string | null {
  const parts = [candidate.fields.jobTitle, candidate.fields.company].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
