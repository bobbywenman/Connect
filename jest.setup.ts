// Never let unit tests create a real Supabase client or hit the network.
// Uses the manual mock in src/lib/__mocks__/supabase.ts.
jest.mock('@/lib/supabase');
