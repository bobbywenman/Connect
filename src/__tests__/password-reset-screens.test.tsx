import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { authMessages } from '@/features/auth/errors';
import { fakeSupabase } from '@/test-utils/fakeSupabase';
import { resetSession, useSession } from '@/store/session';

import ForgotPasswordScreen from '@/app/(auth)/forgot-password';
import ResetPasswordScreen from '@/app/(auth)/reset-password';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

let mockUrl: string | null = null;
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `knowthem:/${path}`,
  useLinkingURL: () => mockUrl,
}));

async function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const press = (label: string) => fireEvent.press(screen.getByLabelText(label));
const type = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);

beforeEach(() => {
  fakeSupabase.reset();
  resetSession();
  mockReplace.mockClear();
  mockUrl = null;
});

describe('ForgotPasswordScreen', () => {
  it('validates the email before calling Supabase', async () => {
    await renderScreen(<ForgotPasswordScreen />);
    await type('Email', 'nope');
    await press('Send reset link');
    expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
    expect(fakeSupabase.resetCalls()).toHaveLength(0);
  });

  it('requests a reset with the app redirect and shows the neutral confirmation', async () => {
    await renderScreen(<ForgotPasswordScreen />);
    await type('Email', 'ada@example.com');
    await press('Send reset link');
    expect(
      await screen.findByText(
        "If an account exists for that email, we've sent a reset link. Check your inbox.",
      ),
    ).toBeOnTheScreen();
    expect(fakeSupabase.resetCalls()).toEqual([
      { email: 'ada@example.com', redirectTo: 'knowthem://reset-password' },
    ]);
    await press('Back to log in');
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('shows a rate-limit message instead of the confirmation', async () => {
    fakeSupabase.setAuthError({ code: 'over_email_send_rate_limit', status: 429, message: 'x' });
    await renderScreen(<ForgotPasswordScreen />);
    await type('Email', 'ada@example.com');
    await press('Send reset link');
    expect(await screen.findByText(authMessages.rateLimited)).toBeOnTheScreen();
    expect(screen.queryByText(/we've sent a reset link/)).toBeNull();
  });

  it('shows a network message', async () => {
    fakeSupabase.setAuthError({ name: 'AuthRetryableFetchError', status: 0, message: 'x' });
    await renderScreen(<ForgotPasswordScreen />);
    await type('Email', 'ada@example.com');
    await press('Send reset link');
    expect(await screen.findByText(authMessages.network)).toBeOnTheScreen();
  });
});

describe('ResetPasswordScreen', () => {
  async function openWith(url: string) {
    mockUrl = url;
    await renderScreen(<ResetPasswordScreen />);
    await screen.findByText('Choose a new password');
  }

  it('exchanges a PKCE code, then updates the password and continues into the app', async () => {
    await openWith('knowthem://reset-password?code=abc');
    expect(fakeSupabase.recoveryCalls().exchange).toEqual(['abc']);
    expect(useSession.getState().recovery).toBe(true);

    await type('New password', 'newpassword1');
    await type('Confirm new password', 'newpassword1');
    await press('Save password');
    expect(await screen.findByText('Password updated')).toBeOnTheScreen();
    expect(fakeSupabase.updateUserCalls()).toEqual([{ password: 'newpassword1' }]);
    // Still pinned to the reset screen until the user continues.
    expect(useSession.getState().recovery).toBe(true);

    await press('Continue');
    expect(useSession.getState().recovery).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('verifies a token_hash link', async () => {
    await openWith('knowthem://reset-password?token_hash=h&type=recovery');
    expect(fakeSupabase.recoveryCalls().verifyOtp).toEqual([{ token_hash: 'h', type: 'recovery' }]);
  });

  it('sets the session from implicit-flow tokens', async () => {
    await openWith('knowthem://reset-password#access_token=a&refresh_token=r&type=recovery');
    expect(fakeSupabase.recoveryCalls().setSession).toEqual([
      { access_token: 'a', refresh_token: 'r' },
    ]);
    expect(useSession.getState().recovery).toBe(true);
  });

  it('validates the new password and confirmation', async () => {
    await openWith('knowthem://reset-password?code=abc');
    await type('New password', 'short');
    await type('Confirm new password', 'different');
    await press('Save password');
    expect(await screen.findByText('Use at least 8 characters')).toBeOnTheScreen();
    expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
    expect(fakeSupabase.updateUserCalls()).toHaveLength(0);
  });

  it('maps update errors', async () => {
    await openWith('knowthem://reset-password?code=abc');
    fakeSupabase.setAuthError({ code: 'same_password', status: 422, message: 'x' });
    await type('New password', 'newpassword1');
    await type('Confirm new password', 'newpassword1');
    await press('Save password');
    expect(await screen.findByText(authMessages.samePassword)).toBeOnTheScreen();
  });

  it('shows a friendly error and a way back when the code is rejected', async () => {
    fakeSupabase.setAuthError({ code: 'otp_expired', status: 403, message: 'expired' });
    mockUrl = 'knowthem://reset-password?code=old';
    await renderScreen(<ResetPasswordScreen />);
    expect(await screen.findByText('This link has expired')).toBeOnTheScreen();
    expect(useSession.getState().recovery).toBe(false);
    await press('Request a new link');
    expect(mockReplace).toHaveBeenCalledWith('/forgot-password');
  });

  it('treats an error redirect as invalid without calling Supabase', async () => {
    mockUrl = 'knowthem://reset-password#error=access_denied&error_code=otp_expired';
    await renderScreen(<ResetPasswordScreen />);
    expect(await screen.findByText('This link has expired')).toBeOnTheScreen();
    expect(fakeSupabase.recoveryCalls()).toEqual({ exchange: [], verifyOtp: [], setSession: [] });
  });

  it('waits for the launch URL, then calls a missing link invalid', async () => {
    jest.useFakeTimers();
    try {
      await renderScreen(<ResetPasswordScreen />);
      expect(screen.getByText('Checking your link')).toBeOnTheScreen();
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });
      expect(screen.getByText('This link has expired')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the form when a recovery session already exists', async () => {
    useSession.setState({ recovery: true });
    await renderScreen(<ResetPasswordScreen />);
    await waitFor(() => expect(screen.getByText('Choose a new password')).toBeOnTheScreen());
  });
});
