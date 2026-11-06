/** Plain-language messages for auth failures. Pure so it can be unit tested. */
export const authMessages = {
  duplicateEmail: 'An account with this email already exists. Try logging in instead.',
  invalidCredentials: 'That email and password do not match. Check them and try again.',
  weakPassword: 'That password is too weak. Use at least 8 characters and mix letters and numbers.',
  network: 'Could not reach the server. Check your internet connection and try again.',
  emailNotConfirmed: 'Please confirm your email first. Check your inbox for the confirmation link.',
  samePassword: 'Choose a password you have not used before.',
  rateLimited: 'Too many attempts. Please wait a moment and try again.',
  fallback: 'Something went wrong. Please try again.',
} as const;

interface ErrorLike {
  name?: unknown;
  code?: unknown;
  status?: unknown;
  message?: unknown;
}

/** Maps a Supabase auth error (or any thrown value) to a message safe to show the user. */
export function mapAuthError(error: unknown): string {
  if (typeof error !== 'object' || error === null) return authMessages.fallback;
  const e = error as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  const name = typeof e.name === 'string' ? e.name : '';

  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered')
  ) {
    return authMessages.duplicateEmail;
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return authMessages.invalidCredentials;
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return authMessages.weakPassword;
  }
  if (code === 'same_password' || message.includes('different from the old password')) {
    return authMessages.samePassword;
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return authMessages.emailNotConfirmed;
  }
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    e.status === 429
  ) {
    return authMessages.rateLimited;
  }
  if (
    name === 'AuthRetryableFetchError' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch')
  ) {
    return authMessages.network;
  }
  return authMessages.fallback;
}
