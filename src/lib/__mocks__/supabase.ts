// Jest manual mock for '@/lib/supabase' (installed globally in jest.setup.ts) so unit
// tests never touch the network. It fakes just enough of auth + the profiles table,
// and emits auth events to subscribers the way supabase-js does.
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const fake = {
  listeners: new Set<Listener>(),
  session: null as Session | null,
  profile: { onboarding_complete: true } as { onboarding_complete: boolean } | null,
  profileError: null as Error | null,
};

function makeSession(): Session {
  return {
    access_token: 'test-access',
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: DEMO_USER_ID, email: 'demo@knowthem.app' },
  } as Session;
}

function emit(event: AuthChangeEvent, session: Session | null) {
  fake.session = session;
  fake.listeners.forEach((l) => l(event, session));
}

const auth = {
  onAuthStateChange: jest.fn((listener: Listener) => {
    fake.listeners.add(listener);
    setTimeout(() => listener('INITIAL_SESSION', fake.session), 0);
    return {
      data: { subscription: { unsubscribe: () => fake.listeners.delete(listener) } },
    };
  }),
  signInWithPassword: jest.fn(async () => {
    const session = makeSession();
    emit('SIGNED_IN', session);
    return { data: { session, user: session.user }, error: null };
  }),
  signOut: jest.fn(async () => {
    emit('SIGNED_OUT', null);
    return { error: null };
  }),
};

const from = jest.fn((_table: string) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: async () => ({ data: fake.profile, error: fake.profileError }),
    }),
  }),
  update: (values: { onboarding_complete?: boolean }) => ({
    eq: async () => {
      if (fake.profile && values.onboarding_complete !== undefined) {
        fake.profile = { ...fake.profile, onboarding_complete: values.onboarding_complete };
      }
      return { error: null };
    },
  }),
}));

export const supabase = { auth, from };

/** Test controls for the fake backend. */
export const fakeSupabase = {
  DEMO_USER_ID,
  /** Reset to signed out, onboarded profile, and clear mock call history. */
  reset() {
    fake.listeners.clear();
    fake.session = null;
    fake.profile = { onboarding_complete: true };
    fake.profileError = null;
    auth.onAuthStateChange.mockClear();
    auth.signInWithPassword.mockClear();
    auth.signOut.mockClear();
    from.mockClear();
  },
  setProfile(profile: { onboarding_complete: boolean } | null) {
    fake.profile = profile;
  },
  getProfile() {
    return fake.profile;
  },
  setProfileError(error: Error | null) {
    fake.profileError = error;
  },
  /** Pretend a stored session exists, so INITIAL_SESSION delivers it. */
  setStoredSession(signedIn: boolean) {
    fake.session = signedIn ? makeSession() : null;
  },
  emit,
  makeSession,
};
