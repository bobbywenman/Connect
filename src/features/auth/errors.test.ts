import { authMessages, mapAuthError } from './errors';

describe('mapAuthError', () => {
  it.each([
    [{ code: 'user_already_exists', status: 422, message: 'x' }, authMessages.duplicateEmail],
    [{ code: 'email_exists', message: 'x' }, authMessages.duplicateEmail],
    [{ message: 'User already registered' }, authMessages.duplicateEmail],
    [{ code: 'invalid_credentials', status: 400 }, authMessages.invalidCredentials],
    [{ message: 'Invalid login credentials' }, authMessages.invalidCredentials],
    [
      { code: 'weak_password', message: 'Password should be at least 8' },
      authMessages.weakPassword,
    ],
    [
      { code: 'email_not_confirmed', message: 'Email not confirmed' },
      authMessages.emailNotConfirmed,
    ],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'x' }, authMessages.network],
    [new TypeError('Network request failed'), authMessages.network],
    [{ code: 'over_request_rate_limit', status: 429 }, authMessages.rateLimited],
    [{ code: 'something_else', message: 'boom' }, authMessages.fallback],
    [new Error('boom'), authMessages.fallback],
    ['string', authMessages.fallback],
    [null, authMessages.fallback],
    [undefined, authMessages.fallback],
  ])('maps %j', (error, expected) => {
    expect(mapAuthError(error)).toBe(expected);
  });
});
