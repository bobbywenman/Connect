// TanStack Query hooks wrapping api.ts (KT-19). Reads use useQuery keyed via queryKeys;
// the save mutation invalidates the list it changes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { useSession } from '@/store/session';

import {
  listCustomRelationshipTypes,
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
