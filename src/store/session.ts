import { useSyncExternalStore } from 'react';

/**
 * TEMPORARY auth-state stub. KT-06 replaces this with the real Supabase-backed
 * session; the shape (`status`, `onboardingComplete`) is what the gate reads.
 */
export interface SessionState {
  status: 'signedOut' | 'signedIn';
  onboardingComplete: boolean;
}

const initialState: SessionState = { status: 'signedOut', onboardingComplete: true };

let state: SessionState = initialState;
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const sessionActions = {
  signIn(options: { onboardingComplete?: boolean } = {}) {
    setState({ status: 'signedIn', onboardingComplete: options.onboardingComplete ?? false });
  },
  completeOnboarding() {
    setState({ ...state, onboardingComplete: true });
  },
  signOut() {
    setState(initialState);
  },
  /** Test helper: put the store back to its initial (signed out) state. */
  reset() {
    setState(initialState);
  },
};

export function getSession(): SessionState {
  return state;
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, getSession);
}
