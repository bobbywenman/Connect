import type { EventDetail } from './api';
import type { EventFormInput } from './schemas';

/** Turn a stored event into form values (null becomes ''), for the edit screen. */
export function eventToFormInput(event: EventDetail): EventFormInput {
  return {
    name: event.name,
    eventDate: event.eventDate ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    networkId: event.networkId ?? '',
  };
}
