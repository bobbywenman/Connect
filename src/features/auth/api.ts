// Auth calls. Screens use the hooks in hooks.ts. Session changes reach the app through
// supabase.auth.onAuthStateChange (see src/store/session.ts), not through return values.
import { supabase } from '@/lib/supabase';

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
