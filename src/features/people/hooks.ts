import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { createPerson, getPerson, listNetworkPeople, updatePerson, type PersonFields } from './api';

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.person.detail(id ?? ''),
    queryFn: () => getPerson(id as string),
    enabled: !!id,
  });
}

/** People in a network (plus Me) and the relationships among them. */
export function useNetworkPeople(networkId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.persons.list({ networkId }),
    queryFn: () => listNetworkPeople(networkId as string),
    enabled: !!networkId,
  });
}

/** Everything a membership change can make stale: counts, lists, the person. */
async function invalidatePeople(queryClient: QueryClient, personId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
    // Prefix match: refreshes the person list of every network.
    queryClient.invalidateQueries({ queryKey: ['persons'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.person.detail(personId) }),
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
