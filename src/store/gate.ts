import type { SessionState } from './session';

/**
 * Decides where the auth gate should send the user.
 * @param segments current route segments, e.g. ['(app)', 'person', '[id]']
 * @returns a path to redirect to, or null when the user may stay (always null while loading).
 */
export function getGateRedirect(
  session: Pick<SessionState, 'status' | 'onboardingComplete'>,
  segments: readonly string[],
): string | null {
  if (session.status === 'loading') return null;

  const inAuth = segments[0] === '(auth)';

  if (session.status === 'signedOut') {
    return inAuth ? null : '/';
  }
  if (inAuth) {
    return session.onboardingComplete ? '/networks' : '/onboarding';
  }
  if (!session.onboardingComplete) {
    return segments[1] === 'onboarding' ? null : '/onboarding';
  }
  return null;
}
