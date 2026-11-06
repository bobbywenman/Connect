// TanStack Query hooks wrapping api.ts (KT-19). Reads use useQuery keyed via queryKeys;
// the save mutation invalidates the list it changes.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { useSession } from '@/store/session';

import type { RelationshipRow } from './labels';

import {
  createRelationship,
  deleteRelationship,
  listCustomRelationshipTypes,
  listPickablePeople,
  updateRelationship,
  saveCustomRelationshipType,
  type CustomRelationshipTypeInput,
} from './api';

export function useCustomRelationshipTypes() {
  const userId = useSession((s) => s.userId);
  return useQuery({
    queryKey: queryKeys.customRelationshipTypes,
    queryFn: listCustomRelationshipTypes,
    enabled: userId !== null,
  });
}

export function useSaveCustomRelationshipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomRelationshipTypeInput) => saveCustomRelationshipType(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.customRelationshipTypes });
    },
  });
}

/** Everyone the flow can connect to (non-archived, including You). */
export function usePickablePeople() {
  const userId = useSession((s) => s.userId);
  return useQuery({
    queryKey: [...queryKeys.persons.all, 'pickable'],
    queryFn: listPickablePeople,
    enabled: userId !== null,
  });
}

/**
 * A relationship change touches both people's pages, every network list (the label under a
 * name) and anything else derived from relationships, so refresh all of them.
 */
async function invalidateRelationships(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.person.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.persons.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
  ]);
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (row: RelationshipRow) => createRelationship(row),
    onSuccess: () => invalidateRelationships(queryClient),
  });
}

export function useUpdateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, row }: { id: string; row: RelationshipRow }) => updateRelationship(id, row),
    onSuccess: () => invalidateRelationships(queryClient),
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRelationship(id),
    onSuccess: () => invalidateRelationships(queryClient),
  });
}
