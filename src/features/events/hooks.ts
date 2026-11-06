import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
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
