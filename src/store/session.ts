import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { getMyProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';

/** Mirrors Supabase auth. `loading` lasts until the stored session (and profile) have been read. */
export interface SessionState {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  userId: string | null;
  /** From `profiles.onboarding_complete`; read after sign-in. */
  onboardingComplete: boolean;
  /** True from a password-recovery link until the new password is saved; the gate pins the user to /reset-password. */
  recovery: boolean;
  setRecovery: (value: boolean) => void;
  setOnboardingComplete: (value: boolean) => void;
}

const initialState = {
  status: 'loading',
  session: null,
  userId: null,
  onboardingComplete: false,
  recovery: false,
} as const satisfies Partial<SessionState>;

export const useSession = create<SessionState>()((set) => ({
  ...initialState,
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
  setRecovery: (recovery) => set({ recovery }),
}));

/** Test helper: put the store back to its initial (loading) state. */
export function resetSession() {
  useSession.setState({ ...initialState });
}

/**
 * Subscribes the store to Supabase auth changes. Call once from the root layout;
 * returns the unsubscribe function. Supabase emits INITIAL_SESSION on subscribe,
 * which is what moves `loading` to `signedOut` / `signedIn`.
 */
export function initSession(): () => void {
  const { set, get } = { set: useSession.setState, get: useSession.getState };
  let profileUserId: string | null = null;

  async function loadProfile(userId: string) {
    let onboardingComplete = false;
    try {
      const profile = await getMyProfile(userId);
      onboardingComplete = profile?.onboarding_complete ?? false;
    } catch {
      // Profile unreadable (e.g. offline): fall back to onboarding rather than blocking sign-in.
    }
    if (get().userId !== userId) return; // signed out or switched user meanwhile
    set({ status: 'signedIn', onboardingComplete });
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      profileUserId = null;
      set({
        status: 'signedOut',
        session: null,
        userId: null,
        onboardingComplete: false,
        recovery: false,
      });
      return;
    }
    set({ session, userId: session.user.id });
    if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
    if (profileUserId !== session.user.id) {
      profileUserId = session.user.id;
      // Never await Supabase calls inside this callback (it can deadlock auth): defer.
      setTimeout(() => void loadProfile(session.user.id), 0);
    }
  });

  return () => data.subscription.unsubscribe();
}
