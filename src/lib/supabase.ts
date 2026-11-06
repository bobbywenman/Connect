import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { sessionStorage } from './secureStorage';

// Expo only inlines EXPO_PUBLIC_* vars when they are read as literal `process.env.NAME`.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing Supabase config: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
      'in .env (copy .env.example), then restart the dev server.',
  );
}

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No OAuth redirect parsing from the URL; native deep links are handled in KT-08/09.
    detectSessionInUrl: false,
  },
});

// Per Supabase's Expo guide: refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  void supabase.auth.startAutoRefresh();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
