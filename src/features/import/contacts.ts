// The only file that touches expo-contacts. Everything else works on plain data.
//
// SDK 58's default `expo-contacts` export is the class API (`Contact.getAllDetails`); the
// old `getContactsAsync` now throws unless imported from `expo-contacts/legacy`.
import {
  Contact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
  type ContactsPermissionResponse,
} from 'expo-contacts';
import { Platform } from 'react-native';

import type { ContactLike } from './contactMapping';

/** expo-contacts has no web implementation; the screen shows a message instead. */
export const isContactImportSupported = Platform.OS !== 'web';

export type ContactsAccess =
  | { state: 'granted'; limited: boolean }
  | { state: 'undetermined' }
  | { state: 'denied'; canAskAgain: boolean };

function toAccess(response: ContactsPermissionResponse): ContactsAccess {
  if (response.granted) {
    // iOS 18+: the person picked "Select Contacts"; we simply get what they shared.
    return { state: 'granted', limited: response.accessPrivileges === 'limited' };
  }
  if (response.status === 'undetermined') return { state: 'undetermined' };
  return { state: 'denied', canAskAgain: response.canAskAgain };
}

export async function getContactsAccess(): Promise<ContactsAccess> {
  return toAccess(await getPermissionsAsync());
}

export async function requestContactsAccess(): Promise<ContactsAccess> {
  return toAccess(await requestPermissionsAsync());
}

const LIST_FIELDS = [
  ContactField.GIVEN_NAME,
  ContactField.FAMILY_NAME,
  ContactField.NICKNAME,
  ContactField.FULL_NAME,
  ContactField.JOB_TITLE,
  ContactField.COMPANY,
  ContactField.DEPARTMENT,
  ContactField.ADDRESSES,
  ContactField.BIRTHDAY,
  ContactField.DATES,
] as const;

const PAGE_SIZE = 200;

/**
 * Every contact the app may read, fetched in pages so a large address book does not arrive
 * as one native call. Photos are NOT loaded here (they are fetched per contact when asked).
 */
export async function loadDeviceContacts(): Promise<ContactLike[]> {
  const all: ContactLike[] = [];
  const seen = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await Contact.getAllDetails(LIST_FIELDS, { limit: PAGE_SIZE, offset });
    // Guard against a platform that ignores `offset` and would loop forever.
    const fresh = page.filter((c) => !seen.has(c.id));
    if (fresh.length === 0) break;
    for (const c of fresh) {
      seen.add(c.id);
      all.push(c as unknown as ContactLike);
    }
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

/** Local file URI of the contact's full-size photo, or null when they have none. */
export async function loadContactPhotoUri(contactId: string): Promise<string | null> {
  const details = await new Contact(contactId).getDetails([ContactField.IMAGE]);
  return details.image ?? null;
}
