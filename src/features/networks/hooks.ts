import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import {
  countPeopleOnlyInNetwork,
  createNetwork,
  deleteNetwork,
  getNetwork,
  listNetworks,
  updateNetwork,
  type NetworkInput,
  type NetworkPatch,
} from './api';

export function useNetworks() {
  return useQuery({ queryKey: queryKeys.networks.all, queryFn: listNetworks });
}

export function useNetwork(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.networks.detail(id ?? ''),
    queryFn: () => getNetwork(id as string),
    enabled: !!id,
  });
}

export function useCreateNetwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NetworkInput) => createNetwork(input),
    // Awaited so the home list is fresh by the time the screen closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
  });
}

export function useUpdateNetwork(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: NetworkPatch) => updateNetwork(id, patch),
    // The list key is a prefix of the detail key, so this refreshes both.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
  });
}

export function useDeleteNetwork(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteNetwork(id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.networks.detail(id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.networks.all });
      // Deleting a network can delete people too.
      await queryClient.invalidateQueries({ queryKey: ['persons'] });
    },
  });
}

/** Counts, on demand and never cached, the people deleting this network would also delete. */
export function useCountPeopleOnlyInNetwork(id: string) {
  return useMutation({ mutationFn: () => countPeopleOnlyInNetwork(id) });
}
