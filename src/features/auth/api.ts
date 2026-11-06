// Auth calls. Screens use the hooks in hooks.ts. Session changes reach the app through
// supabase.auth.onAuthStateChange (see src/store/session.ts), not through return values.
import { supabase } from '@/lib/supabase';

import type { RecoveryLink } from './recoveryLink';
import type { LoginValues, SignUpValues } from './schemas';

export interface SignUpResult {
  /** True when the project requires email confirmation, so no session exists yet. */
  needsEmailConfirmation: boolean;
}

export async function signUp({ name, email, password }: SignUpValues): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // The database signup trigger reads `name` to create the profile and the "self" person.
    options: { data: { name } },
  });
  if (error) throw error;
  // With confirmations on, an already-registered email returns a user with no identities
  // (to avoid leaking which emails exist) instead of an error.
  if (data.user && data.user.identities?.length === 0) {
    throw Object.assign(new Error('User already registered'), { code: 'user_already_exists' });
  }
  return { needsEmailConfirmation: data.session === null };
}

export async function signIn({ email, password }: LoginValues): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Emails a reset link. `redirectTo` is where the link lands in the app (Linking.createURL('/reset-password')).
 * Supabase does not error for unknown emails, so callers can show one neutral confirmation.
 */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** Turns a parsed recovery link into a (recovery) session. Throws when the link is invalid or expired. */
export async function startRecoverySession(
  link: Exclude<RecoveryLink, { kind: 'error' | 'none' }>,
): Promise<void> {
  let error: Error | null;
  if (link.kind === 'code') {
    ({ error } = await supabase.auth.exchangeCodeForSession(link.code));
  } else if (link.kind === 'tokenHash') {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: 'recovery' }));
  } else {
    ({ error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    }));
  }
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
