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

type NetworkRow = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  description: string | null;
};

/** In-memory networks, plus how many people each one holds and how many of those are only in it. */
const networks = {
  rows: [] as NetworkRow[],
  onlyPeople: {} as Record<string, number>,
  error: null as Error | null,
  nextId: 1,
};

const networkColumns = (row: NetworkRow) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  color: row.color,
  description: row.description,
});

const networksTable = {
  select: (_columns: string) => ({
    eq: (_column: 'id', id: string) => ({
      maybeSingle: async () => {
        if (networks.error) return { data: null, error: networks.error };
        const row = networks.rows.find((r) => r.id === id);
        return { data: row ? networkColumns(row) : null, error: null };
      },
    }),
    order: async () => {
      if (networks.error) return { data: null, error: networks.error };
      return {
        data: networks.rows.map((r) => ({ ...networkColumns(r), person_count: 0 })),
        error: null,
      };
    },
  }),
  insert: (values: Omit<NetworkRow, 'id'>) => ({
    select: (_columns: string) => ({
      single: async () => {
        if (networks.error) return { data: null, error: networks.error };
        const row: NetworkRow = { id: `net-${networks.nextId++}`, ...values };
        networks.rows.push(row);
        return { data: networkColumns(row), error: null };
      },
    }),
  }),
  update: (values: Partial<NetworkRow>) => ({
    eq: (_column: 'id', id: string) => ({
      select: (_columns: string) => ({
        single: async () => {
          if (networks.error) return { data: null, error: networks.error };
          const index = networks.rows.findIndex((r) => r.id === id);
          const existing = networks.rows[index];
          if (!existing) return { data: null, error: new Error('not found') };
          const row = { ...existing, ...values };
          networks.rows[index] = row;
          return { data: networkColumns(row), error: null };
        },
      }),
    }),
  }),
};

const rpc = jest.fn(async (fn: string, args: { network_id: string }) => {
  if (networks.error) return { data: null, error: networks.error };
  if (fn === 'count_people_only_in_network') {
    return { data: networks.onlyPeople[args.network_id] ?? 0, error: null };
  }
  if (fn === 'delete_network') {
    networks.rows = networks.rows.filter((r) => r.id !== args.network_id);
    return { data: networks.onlyPeople[args.network_id] ?? 0, error: null };
  }
  return { data: null, error: new Error(`unknown rpc ${fn}`) };
});

const from = jest.fn((table: string) => {
  if (table === 'custom_relationship_types') return customTypesTable;
  if (table === 'networks' || table === 'networks_with_counts') return networksTable;
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

export const supabase = { auth, from, rpc };

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
    networks.rows = [];
    networks.onlyPeople = {};
    networks.error = null;
    networks.nextId = 1;
    rpc.mockClear();
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
  /** Seed networks; `onlyPeople` is how many people deleting it would also delete. */
  setNetworks(rows: (Partial<NetworkRow> & { id: string; name: string; onlyPeople?: number })[]) {
    networks.rows = rows.map((r) => ({
      type: 'custom',
      color: 'blue',
      description: null,
      ...r,
    }));
    networks.onlyPeople = Object.fromEntries(rows.map((r) => [r.id, r.onlyPeople ?? 0]));
  },
  getNetworks() {
    return networks.rows.map(networkColumns);
  },
  setNetworksError(error: Error | null) {
    networks.error = error;
  },
  /** Pretend a stored session exists, so INITIAL_SESSION delivers it. */
  setStoredSession(signedIn: boolean) {
    fake.session = signedIn ? makeSession() : null;
  },
  emit,
  makeSession,
};
