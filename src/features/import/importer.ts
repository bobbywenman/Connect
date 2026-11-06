// The import pipeline: create people one at a time, in small sequential batches, and keep
// going when one fails (KT-31, reused by KT-32). Source-agnostic: it only sees candidates.
import { createPerson, type Person } from '@/features/people/api';

import { candidateName, type ImportCandidate } from './types';

export interface ImportFailure {
  name: string;
  reason: string;
}

export interface ImportResult {
  imported: number;
  failed: ImportFailure[];
  /** People saved whose photo could not be attached. */
  photosFailed: number;
  /** Imported people whose source birthday had no year and was left out. */
  birthdaysWithoutYear: number;
}

export interface ImportProgress {
  /** Candidates handled so far (imported or failed). */
  done: number;
  total: number;
}

export interface ImportOptions {
  networkId: string;
  onProgress?: (progress: ImportProgress) => void;
  /** Called after a person is created; throw to report a photo problem (the person is kept). */
  attachPhoto?: (person: Person, candidate: ImportCandidate) => Promise<void>;
  /** People per batch; the event loop gets a turn between batches so the UI stays responsive. */
  batchSize?: number;
  /** Injected in tests. */
  create?: typeof createPerson;
}

export const IMPORT_BATCH_SIZE = 5;

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function reasonOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

export async function importCandidates(
  candidates: readonly ImportCandidate[],
  options: ImportOptions,
): Promise<ImportResult> {
  const { networkId, onProgress, attachPhoto, create = createPerson } = options;
  const batchSize = Math.max(1, options.batchSize ?? IMPORT_BATCH_SIZE);
  const result: ImportResult = {
    imported: 0,
    failed: [],
    photosFailed: 0,
    birthdaysWithoutYear: 0,
  };
  const total = candidates.length;
  onProgress?.({ done: 0, total });

  for (let start = 0; start < total; start += batchSize) {
    for (const candidate of candidates.slice(start, start + batchSize)) {
      try {
        const person = await create(candidate.fields, [networkId], candidate.source);
        result.imported += 1;
        if (candidate.birthdayWithoutYear) result.birthdaysWithoutYear += 1;
        if (attachPhoto) {
          try {
            await attachPhoto(person, candidate);
          } catch {
            result.photosFailed += 1;
          }
        }
      } catch (error) {
        result.failed.push({ name: candidateName(candidate), reason: reasonOf(error) });
      }
      onProgress?.({ done: result.imported + result.failed.length, total });
    }
    if (start + batchSize < total) await yieldToUi();
  }
  return result;
}
