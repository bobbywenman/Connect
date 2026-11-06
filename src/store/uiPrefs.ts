import { create } from 'zustand';

/**
 * Pattern for small client-only UI preferences: a zustand store with plain
 * values and setters. Not persisted yet (add zustand's `persist` middleware if needed).
 */
interface UiPrefsState {
  lastNetworkId: string | null;
  setLastNetworkId: (id: string | null) => void;
}

export const useUiPrefs = create<UiPrefsState>()((set) => ({
  lastNetworkId: null,
  setLastNetworkId: (lastNetworkId) => set({ lastNetworkId }),
}));
