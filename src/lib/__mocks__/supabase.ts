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
  /** Returned as `error` by the next auth call (signUp / signInWithPassword / signOut). */
  authError: null as unknown,
  /** When true, signUp returns no session (email confirmation required). */
  requireConfirmation: false,
  /** When true, signUp pretends the email is already registered (confirmations-on behaviour). */
  obfuscatedDuplicate: false,
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
  signInWithPassword: jest.fn(async (_credentials: { email: string; password: string }) => {
    if (fake.authError) return { data: { session: null, user: null }, error: fake.authError };
    const session = makeSession();
    emit('SIGNED_IN', session);
    return { data: { session, user: session.user }, error: null };
  }),
  signUp: jest.fn(
    async (_args: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => {
      if (fake.authError) return { data: { session: null, user: null }, error: fake.authError };
      if (fake.obfuscatedDuplicate) {
        const user = { ...makeSession().user, identities: [] };
        return { data: { session: null, user }, error: null };
      }
      const session = makeSession();
      if (fake.requireConfirmation) {
        return { data: { session: null, user: session.user }, error: null };
      }
      emit('SIGNED_IN', session);
      return { data: { session, user: session.user }, error: null };
    },
  ),
  resetPasswordForEmail: jest.fn(async (_email: string, _options?: { redirectTo?: string }) => {
    // Like the real backend: no error for unknown emails.
    return { data: {}, error: fake.authError };
  }),
  exchangeCodeForSession: jest.fn(async (_code: string) => {
    if (fake.authError) return { data: { session: null, user: null }, error: fake.authError };
    const session = makeSession();
    emit('PASSWORD_RECOVERY', session);
    return { data: { session, user: session.user }, error: null };
  }),
  verifyOtp: jest.fn(async (_params: { token_hash: string; type: string }) => {
    if (fake.authError) return { data: { session: null, user: null }, error: fake.authError };
    const session = makeSession();
    emit('PASSWORD_RECOVERY', session);
    return { data: { session, user: session.user }, error: null };
  }),
  setSession: jest.fn(async (_tokens: { access_token: string; refresh_token: string }) => {
    if (fake.authError) return { data: { session: null, user: null }, error: fake.authError };
    const session = makeSession();
    emit('SIGNED_IN', session);
    return { data: { session, user: session.user }, error: null };
  }),
  updateUser: jest.fn(async (_attributes: { password?: string }) => {
    if (fake.authError) return { data: { user: null }, error: fake.authError };
    const session = makeSession();
    emit('USER_UPDATED', session);
    return { data: { user: session.user }, error: null };
  }),
  signOut: jest.fn(async () => {
    if (fake.authError) return { error: fake.authError };
    emit('SIGNED_OUT', null);
    return { error: null };
  }),
};

type CustomTypeRow = {
  id: string;
  owner_id: string;
  label: string;
  inverse_label: string;
  created_at: string;
  updated_at: string;
};

/** Rows of custom_relationship_types, all owners (RLS is not simulated; tests seed the caller's rows). */
const customTypes = {
  rows: [] as CustomTypeRow[],
  error: null as Error | null,
  nextId: 1,
};

const customTypesTable = {
  select: (_columns: string) => ({
    order: async (column: 'label', options: { ascending: boolean } = { ascending: true }) => {
      if (customTypes.error) return { data: null, error: customTypes.error };
      const sign = options.ascending ? 1 : -1;
      const data = [...customTypes.rows].sort((a, b) => sign * a[column].localeCompare(b[column]));
      return { data, error: null };
    },
  }),
  insert: (values: { label: string; inverse_label: string }) => ({
    select: () => ({
      single: async () => {
        if (customTypes.error) return { data: null, error: customTypes.error };
        // Mirror the unique index on (owner_id, lower(label)).
        const clash = customTypes.rows.some(
          (r) =>
            r.owner_id === DEMO_USER_ID && r.label.toLowerCase() === values.label.toLowerCase(),
        );
        if (clash) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          };
        }
        const now = new Date(0).toISOString();
        const row: CustomTypeRow = {
          id: `ct-${customTypes.nextId++}`,
          owner_id: DEMO_USER_ID,
          label: values.label,
          inverse_label: values.inverse_label,
          created_at: now,
          updated_at: now,
        };
        customTypes.rows.push(row);
        return { data: row, error: null };
      },
    }),
  }),
};

const from = jest.fn((table: string) => {
  if (table === 'custom_relationship_types') return customTypesTable;
  return {
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
  };
});

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
    customTypes.rows = [];
    customTypes.error = null;
    customTypes.nextId = 1;
    fake.authError = null;
    fake.requireConfirmation = false;
    fake.obfuscatedDuplicate = false;
    auth.onAuthStateChange.mockClear();
    auth.signInWithPassword.mockClear();
    auth.signUp.mockClear();
    auth.signOut.mockClear();
    auth.resetPasswordForEmail.mockClear();
    auth.exchangeCodeForSession.mockClear();
    auth.verifyOtp.mockClear();
    auth.setSession.mockClear();
    auth.updateUser.mockClear();
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
  /** Seed custom_relationship_types rows for the signed-in demo user. */
  setCustomRelationshipTypes(rows: { label: string; inverse_label: string }[]) {
    customTypes.rows = rows.map((r, i) => ({
      id: `ct-${customTypes.nextId++}`,
      owner_id: DEMO_USER_ID,
      label: r.label,
      inverse_label: r.inverse_label,
      created_at: new Date(i).toISOString(),
      updated_at: new Date(i).toISOString(),
    }));
  },
  getCustomRelationshipTypes() {
    return [...customTypes.rows];
  },
  setCustomRelationshipTypesError(error: Error | null) {
    customTypes.error = error;
  },
  signInCalls() {
    return auth.signInWithPassword.mock.calls.map(([credentials]) => credentials);
  },
  signUpCalls() {
    return auth.signUp.mock.calls.map(([args]) => args);
  },
  resetCalls() {
    return auth.resetPasswordForEmail.mock.calls.map(([email, options]) => ({ email, ...options }));
  },
  recoveryCalls() {
    return {
      exchange: auth.exchangeCodeForSession.mock.calls.map(([code]) => code),
      verifyOtp: auth.verifyOtp.mock.calls.map(([params]) => params),
      setSession: auth.setSession.mock.calls.map(([tokens]) => tokens),
    };
  },
  updateUserCalls() {
    return auth.updateUser.mock.calls.map(([attributes]) => attributes);
  },
  setAuthError(error: unknown) {
    fake.authError = error;
  },
  setRequireConfirmation(value: boolean) {
    fake.requireConfirmation = value;
  },
  setObfuscatedDuplicate(value: boolean) {
    fake.obfuscatedDuplicate = value;
  },
  /** Pretend a stored session exists, so INITIAL_SESSION delivers it. */
  setStoredSession(signedIn: boolean) {
    fake.session = signedIn ? makeSession() : null;
  },
  emit,
  makeSession,
};
