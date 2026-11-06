import type { SessionState } from './session';

/**
 * Decides where the auth gate should send the user.
 * @param segments current route segments, e.g. ['(app)', 'person', '[id]']
 * @returns a path to redirect to, or null when the user may stay (always null while loading).
 */
export function getGateRedirect(
  session: Pick<SessionState, 'status' | 'onboardingComplete' | 'recovery'>,
  segments: readonly string[],
): string | null {
  if (session.status === 'loading') return null;

  const inAuth = segments[0] === '(auth)';

  // The reset link signs the user in with a recovery session. The reset screen is exempt from
  // every redirect so a cold-start deep link isn't bounced to the app (signed-in) or away
  // before the link has been processed. Meanwhile a recovery session stays pinned to it.
  if (inAuth && segments[1] === 'reset-password') return null;
  if (session.status === 'signedIn' && session.recovery) return '/reset-password';

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
