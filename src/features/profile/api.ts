// Data-access pattern for every feature: this file is the ONLY place that talks to
// Supabase for the feature. Functions are plain async, throw on error, and return
// typed rows. Screens never import this directly; they use the hooks in hooks.ts.
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/** The signed-in user's profile row (RLS limits `profiles` to your own), or null if none exists. */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setOnboardingComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_complete: true })
    .eq('id', userId);
  if (error) throw error;
}
