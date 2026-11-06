// Never let unit tests create a real Supabase client or hit the network.
// Uses the manual mock in src/lib/__mocks__/supabase.ts.
jest.mock('@/lib/supabase');

// FlashList measures layout natively; this fixes a 400x900 viewport so rows render in tests.
require('@shopify/flash-list/jestSetup');
