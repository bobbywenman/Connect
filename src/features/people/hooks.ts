import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { requestReminderSync } from '@/features/notifications/scheduler';
import { useSession } from '@/store/session';

import {
  archivePerson,
  createPerson,
  deletePerson,
  getPerson,
  getPersonDetail,
  getSelfPerson,
  listNetworkPeople,
  removeFromNetwork,
  unarchivePerson,
  updatePerson,
  type PersonFields,
} from './api';

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.person.detail(id ?? ''),
    queryFn: () => getPerson(id as string),
    enabled: !!id,
  });
}

/** Person + networks + connections for the detail screen. Resolves to null when not found. */
export function usePersonDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.person.full(id ?? ''),
    queryFn: () => getPersonDetail(id as string),
    enabled: !!id,
  });
}

/** The signed-in user's self person ("You", D-2). */
export function useSelfPerson() {
  const userId = useSession((s) => s.userId);
  return useQuery({
    queryKey: queryKeys.person.self,
    queryFn: () => getSelfPerson(userId as string),
    enabled: userId !== null,
  });
}

/** People in a network (plus Me) and the relationships among them. */
export function useNetworkPeople(networkId: string | undefined, includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.persons.list({ networkId, includeArchived }),
    queryFn: () => listNetworkPeople(networkId as string, { includeArchived }),
    enabled: !!networkId,
  });
}

/** Everything a membership change can make stale: counts, lists, the person. */
async function invalidatePeople(queryClient: QueryClient, personId: string) {
  // Dates, reminder flags or archive state may have changed: re-plan device reminders (debounced).
  requestReminderSync();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
    // Prefix match: refreshes the person list of every network.
    queryClient.invalidateQueries({ queryKey: ['persons'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.person.detail(personId) }),
    // The self person has its own key (KT-11), so refresh it as well.
    queryClient.invalidateQueries({ queryKey: queryKeys.person.self }),
  ]);
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fields, networkIds }: { fields: PersonFields; networkIds: string[] }) =>
      createPerson(fields, networkIds),
    onSuccess: (person) => invalidatePeople(queryClient, person.id),
  });
}

export function useUpdatePerson(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fields,
      networkIds,
    }: {
      fields: PersonFields;
      networkIds: string[] | undefined;
    }) => updatePerson(id, fields, networkIds),
    onSuccess: () => invalidatePeople(queryClient, id),
  });
}

export function useArchivePerson(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archivePerson(id),
    onSuccess: () => invalidatePeople(queryClient, id),
  });
}

export function useUnarchivePerson(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unarchivePerson(id),
    onSuccess: () => invalidatePeople(queryClient, id),
  });
}

export function useDeletePerson(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deletePerson(id),
    onSuccess: async () => {
      requestReminderSync();
      // The person is gone: drop their cached page rather than refetching into "not found",
      // and refresh everyone else's (their connections lose this person).
      queryClient.removeQueries({ queryKey: queryKeys.person.detail(id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
        queryClient.invalidateQueries({ queryKey: ['persons'] }),
        queryClient.invalidateQueries({ queryKey: ['person'] }),
      ]);
    },
  });
}

export function useRemoveFromNetwork(personId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (networkId: string) => removeFromNetwork(personId, networkId),
    onSuccess: () => invalidatePeople(queryClient, personId),
  });
}
