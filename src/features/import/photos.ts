import type { Person } from '@/features/people/api';
import { preparePhoto, uploadPersonPhoto } from '@/features/people/photos';

import { loadContactPhotoUri } from './contacts';
import type { ImportCandidate } from './types';

/**
 * Attach the contact's photo to a freshly created person: fetch it from the address book,
 * crop and shrink it (D-13), then upload. Contacts without a photo are fine (no-op).
 */
export async function attachContactPhoto(
  person: Person,
  candidate: ImportCandidate,
): Promise<void> {
  if (!candidate.photoRef) return;
  const uri = await loadContactPhotoUri(candidate.photoRef);
  if (!uri) return;
  await uploadPersonPhoto(person, await preparePhoto(uri));
}
