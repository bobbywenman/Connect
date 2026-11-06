import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '@/lib/queryKeys';

import { dismissDuplicate, listDismissals, listPeopleForDuplicateCheck } from './api';
import { findAllDuplicatePairs } from './duplicates';

export const peopleForDuplicateCheckQuery = {
  queryKey: queryKeys.duplicates.people,
  queryFn: listPeopleForDuplicateCheck,
};

export const dismissalsQuery = {
  queryKey: queryKeys.duplicates.dismissals,
  queryFn: listDismissals,
};

/** Likely duplicate pairs across all of the user's people, minus dismissed ones. */
export function useDuplicatePairs() {
  const people = useQuery(peopleForDuplicateCheckQuery);
  const dismissals = useQuery(dismissalsQuery);
  const pairs = useMemo(
    () =>
      people.data && dismissals.data ? findAllDuplicatePairs(people.data, dismissals.data) : [],
    [people.data, dismissals.data],
  );
  return {
    pairs,
    isPending: people.isPending || dismissals.isPending,
    isError: people.isError || dismissals.isError,
    refetch: () => {
      void people.refetch();
      void dismissals.refetch();
    },
  };
}

export function useDismissDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ aId, bId }: { aId: string; bId: string }) => dismissDuplicate(aId, bId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.duplicates.dismissals }),
  });
}
