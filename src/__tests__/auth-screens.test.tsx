import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { authMessages } from '@/features/auth/errors';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import LoginScreen from '@/app/(auth)/login';
import SignUpScreen from '@/app/(auth)/sign-up';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe('LoginScreen', () => {
  it('shows inline errors and does not call Supabase for invalid input', async () => {
    await renderScreen(<LoginScreen />);
    await type('Email', 'nope');
    await press('Log in');
    expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password')).toBeOnTheScreen();
    expect(fakeSupabase.signInCalls()).toHaveLength(0);
  });

  it('signs in with the entered credentials', async () => {
    await renderScreen(<LoginScreen />);
    await type('Email', 'ada@example.com');
    await type('Password', 'password123');
    await press('Log in');
    await waitFor(() =>
      expect(fakeSupabase.signInCalls()).toEqual([
        { email: 'ada@example.com', password: 'password123' },
      ]),
    );
  });

  it('shows a plain-language message for wrong credentials', async () => {
    fakeSupabase.setAuthError({ code: 'invalid_credentials', status: 400, message: 'x' });
    await renderScreen(<LoginScreen />);
    await type('Email', 'ada@example.com');
    await type('Password', 'wrong-password');
    await press('Log in');
    expect(await screen.findByText(authMessages.invalidCredentials)).toBeOnTheScreen();
  });

  it('links to forgot password and sign up', async () => {
    await renderScreen(<LoginScreen />);
    await press('Forgot password?');
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
    await press('Create an account');
    expect(mockReplace).toHaveBeenCalledWith('/sign-up');
  });

  it('uses autofill-friendly input settings', async () => {
    await renderScreen(<LoginScreen />);
    const email = screen.getByLabelText('Email');
    expect(email.props.keyboardType).toBe('email-address');
    expect(email.props.textContentType).toBe('emailAddress');
    const password = screen.getByLabelText('Password');
    expect(password.props.secureTextEntry).toBe(true);
    expect(password.props.autoComplete).toBe('current-password');
  });
});

describe('SignUpScreen', () => {
  async function fill(overrides: Partial<Record<string, string>> = {}) {
    const values = {
      Name: 'Ada Lovelace',
      Email: 'ada@example.com',
      Password: 'password123',
      'Confirm password': 'password123',
      ...overrides,
    };
    for (const [label, text] of Object.entries(values)) await type(label, text as string);
  }

  it('validates every field inline', async () => {
    await renderScreen(<SignUpScreen />);
    await fill({ Name: '', Email: 'bad', Password: 'short', 'Confirm password': 'other' });
    await press('Create account');
    expect(await screen.findByText('Enter your name')).toBeOnTheScreen();
    expect(screen.getByText('Enter a valid email address')).toBeOnTheScreen();
    expect(screen.getByText('Use at least 8 characters')).toBeOnTheScreen();
    expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
    expect(fakeSupabase.signUpCalls()).toHaveLength(0);
  });

  it('signs up with the name in user metadata', async () => {
    await renderScreen(<SignUpScreen />);
    await fill();
    await press('Create account');
    await waitFor(() =>
      expect(fakeSupabase.signUpCalls()).toEqual([
        {
          email: 'ada@example.com',
          password: 'password123',
          options: { data: { name: 'Ada Lovelace' } },
        },
      ]),
    );
  });

  it('shows a clear error for a duplicate email', async () => {
    fakeSupabase.setAuthError({ code: 'user_already_exists', status: 422, message: 'x' });
    await renderScreen(<SignUpScreen />);
    await fill();
    await press('Create account');
    expect(await screen.findByText(authMessages.duplicateEmail)).toBeOnTheScreen();
  });

  it('treats an obfuscated duplicate (confirmations on) as a duplicate error', async () => {
    fakeSupabase.setObfuscatedDuplicate(true);
    await renderScreen(<SignUpScreen />);
    await fill();
    await press('Create account');
    expect(await screen.findByText(authMessages.duplicateEmail)).toBeOnTheScreen();
  });

  it('asks the user to check their email when confirmation is required', async () => {
    fakeSupabase.setRequireConfirmation(true);
    await renderScreen(<SignUpScreen />);
    await fill();
    await press('Create account');
    expect(await screen.findByText('Check your email to confirm')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Password')).toBeNull();
    await press('Go to log in');
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('uses new-password autofill hints', async () => {
    await renderScreen(<SignUpScreen />);
    expect(screen.getByLabelText('Password').props.textContentType).toBe('newPassword');
    expect(screen.getByLabelText('Password').props.autoComplete).toBe('new-password');
    expect(screen.getByLabelText('Name').props.textContentType).toBe('name');
  });
});
