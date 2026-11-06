// Mutations wrapping api.ts. The session store updates itself from auth events.
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requestPasswordReset, signIn, signOut, signUp, updatePassword } from './api';

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    // Drop cached data so the next user never sees the previous user's.
    onSuccess: () => queryClient.clear(),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: ({ email, redirectTo }: { email: string; redirectTo: string }) =>
      requestPasswordReset(email, redirectTo),
  });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword });
}
