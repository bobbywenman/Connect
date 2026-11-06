import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: false },
  },
});

/**
 * React Native has no window focus event: treat "app in foreground" as focus so
 * stale queries refetch when the user returns to the app. Returns an unsubscribe.
 *
 * Note: onlineManager is not wired because no netinfo package (e.g.
 * @react-native-community/netinfo) is installed yet; TanStack assumes online.
 */
export function setupFocusManager(): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
  return () => sub.remove();
}
