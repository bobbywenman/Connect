// Test controls for the fake Supabase backend. Reads them off the mocked module
// (installed in jest.setup.ts) so tests share the exact instance the app code uses.
type MockModule = typeof import('@/lib/__mocks__/supabase');

export const fakeSupabase = jest.requireMock<MockModule>('@/lib/supabase').fakeSupabase;
