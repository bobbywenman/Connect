import { act, waitFor } from '@testing-library/react-native';

import { fakeSupabase } from '@/test-utils/fakeSupabase';
import { supabase } from '@/lib/supabase';

import { initSession, resetSession, useSession } from './session';

describe('session store', () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    fakeSupabase.reset();
    resetSession();
  });

  afterEach(() => {
    unsubscribe?.();
  });

  it('starts in loading with no user', () => {
    expect(useSession.getState()).toMatchObject({
      status: 'loading',
      session: null,
      userId: null,
      onboardingComplete: false,
    });
  });

  it('moves to signedOut when there is no stored session', async () => {
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedOut'));
    expect(useSession.getState().userId).toBeNull();
  });

  it('restores a stored session and reads onboarding_complete from the profile', async () => {
    fakeSupabase.setStoredSession(true);
    fakeSupabase.setProfile({ onboarding_complete: false });
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(useSession.getState()).toMatchObject({
      userId: fakeSupabase.DEMO_USER_ID,
      onboardingComplete: false,
    });
    expect(useSession.getState().session?.access_token).toBe('test-access');
  });

  it('stays loading until the profile has been read', async () => {
    fakeSupabase.setStoredSession(true);
    unsubscribe = initSession();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0)); // INITIAL_SESSION delivered, profile pending
    });
    // After the profile resolves it is signedIn; never signedIn with a guessed flag.
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(useSession.getState().onboardingComplete).toBe(true);
  });

  it('signs in and out through real auth calls', async () => {
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedOut'));

    await act(async () => {
      await supabase.auth.signInWithPassword({ email: 'a@b.c', password: 'x' });
    });
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(useSession.getState().onboardingComplete).toBe(true);

    await act(async () => {
      await supabase.auth.signOut();
    });
    expect(useSession.getState()).toMatchObject({
      status: 'signedOut',
      session: null,
      userId: null,
      onboardingComplete: false,
    });
  });

  it('does not reload the profile on token refresh for the same user', async () => {
    fakeSupabase.setStoredSession(true);
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    const calls = (supabase.from as jest.Mock).mock.calls.length;
    await act(async () => {
      fakeSupabase.emit('TOKEN_REFRESHED', fakeSupabase.makeSession());
      await new Promise((r) => setTimeout(r, 5));
    });
    expect((supabase.from as jest.Mock).mock.calls.length).toBe(calls);
    expect(useSession.getState().status).toBe('signedIn');
  });

  it('falls back to onboardingComplete=false when the profile cannot be read', async () => {
    fakeSupabase.setStoredSession(true);
    fakeSupabase.setProfileError(new Error('offline'));
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(useSession.getState().onboardingComplete).toBe(false);
  });

  it('treats a missing profile row as not onboarded', async () => {
    fakeSupabase.setStoredSession(true);
    fakeSupabase.setProfile(null);
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(useSession.getState().onboardingComplete).toBe(false);
  });

  it('stops listening after unsubscribe', async () => {
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedOut'));
    unsubscribe();
    act(() => {
      fakeSupabase.emit('SIGNED_IN', fakeSupabase.makeSession());
    });
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('setOnboardingComplete updates the flag', () => {
    useSession.getState().setOnboardingComplete(true);
    expect(useSession.getState().onboardingComplete).toBe(true);
  });

  it('sets the recovery flag on PASSWORD_RECOVERY and clears it on sign-out', async () => {
    unsubscribe = initSession();
    await waitFor(() => expect(useSession.getState().status).toBe('signedOut'));
    expect(useSession.getState().recovery).toBe(false);
    act(() => fakeSupabase.emit('PASSWORD_RECOVERY', fakeSupabase.makeSession()));
    expect(useSession.getState().recovery).toBe(true);
    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    act(() => fakeSupabase.emit('SIGNED_OUT', null));
    expect(useSession.getState().recovery).toBe(false);
  });
});
