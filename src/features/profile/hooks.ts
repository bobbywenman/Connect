// TanStack Query hooks wrapping api.ts. Reads are useQuery keyed via queryKeys;
// writes are useMutation and invalidate (or update) the keys they affect.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { useSession } from '@/store/session';

import { getMyProfile, setOnboardingComplete } from './api';

export function useMyProfile() {
  const userId = useSession((s) => s.userId);
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => getMyProfile(userId as string),
    enabled: userId !== null,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.userId);
  return useMutation({
    mutationFn: () => setOnboardingComplete(userId as string),
    onSuccess: async () => {
      // Keep the session store (read by the route gate) in step with the database.
      useSession.getState().setOnboardingComplete(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
