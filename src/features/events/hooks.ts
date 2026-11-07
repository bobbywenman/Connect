import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import {
  createEvent,
  deleteEvent,
  getEvent,
  listAllPeopleForPicker,
  listEvents,
  setEventAttendees,
  updateEvent,
  type EventFields,
} from './api';

export function useEvents() {
  return useQuery({ queryKey: queryKeys.events.all, queryFn: listEvents });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(id ?? ''),
    queryFn: () => getEvent(id as string),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: EventFields) => createEvent(fields),
    // Prefix match: refreshes the list and every event detail.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: EventFields) => updateEvent(id, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: (_data, id) => {
      // Drop the deleted event's detail first so nothing refetches a row that is gone.
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

/** Everyone the attendee picker can offer. Under the `persons` prefix, so person edits refresh it. */
export function usePickerPeople() {
  return useQuery({ queryKey: queryKeys.persons.picker, queryFn: listAllPeopleForPicker });
}

export function useSetEventAttendees(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personIds: string[]) => setEventAttendees(eventId, personIds),
    // Prefix match: the events list (counts) and every event detail.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}
