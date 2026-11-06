import type { PersonWithNetworks } from './api';
import { emptyPersonForm, type PersonFormInput } from './schemas';

/** Turn a stored person into form values (null becomes ''), for the edit screen. */
export function personToFormInput(person: PersonWithNetworks): PersonFormInput {
  return {
    firstName: person.first_name,
    lastName: person.last_name ?? '',
    preferredName: person.preferred_name ?? '',
    networkIds: person.networkIds,
    pronouns: person.pronouns ?? '',
    birthdate: person.birthdate ?? '',
    birthdayReminder: person.birthday_reminder,
    anniversaryDate: person.anniversary_date ?? '',
    anniversaryReminder: person.anniversary_reminder,
    locationCity: person.location_city ?? '',
    jobTitle: person.job_title ?? '',
    company: person.company ?? '',
    department: person.department ?? '',
    notes: person.notes ?? '',
    tags: person.tags,
    funFacts: person.fun_facts ?? '',
    conversationStarters: person.conversation_starters ?? '',
  };
}

/**
 * Networks to pre-select on the add form: the one the user came from, else the only
 * network if there is just one, else none.
 */
export function defaultNetworkIds(
  networks: readonly { id: string }[],
  cameFromNetworkId: string | undefined,
): string[] {
  if (cameFromNetworkId && networks.some((n) => n.id === cameFromNetworkId)) {
    return [cameFromNetworkId];
  }
  return networks.length === 1 ? [networks[0]!.id] : [];
}

export function newPersonFormInput(networkIds: string[]): PersonFormInput {
  return { ...emptyPersonForm, networkIds };
}
