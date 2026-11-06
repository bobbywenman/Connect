import { getGateRedirect } from './gate';

const loading = { status: 'loading', onboardingComplete: false } as const;
const out = { status: 'signedOut', onboardingComplete: true } as const;
const fresh = { status: 'signedIn', onboardingComplete: false } as const;
const done = { status: 'signedIn', onboardingComplete: true } as const;

describe('getGateRedirect', () => {
  it('never redirects while the session is loading', () => {
    expect(getGateRedirect(loading, [])).toBeNull();
    expect(getGateRedirect(loading, ['(auth)'])).toBeNull();
    expect(getGateRedirect(loading, ['(app)', '(tabs)', 'networks'])).toBeNull();
  });
  it('keeps signed-out users in (auth)', () => {
    expect(getGateRedirect(out, ['(auth)', 'login'])).toBeNull();
    expect(getGateRedirect(out, ['(auth)'])).toBeNull();
  });
  it('sends signed-out users away from the app', () => {
    expect(getGateRedirect(out, ['(app)', '(tabs)', 'networks'])).toBe('/');
    expect(getGateRedirect(out, ['(app)', 'person', '[id]'])).toBe('/');
    expect(getGateRedirect(out, [])).toBe('/');
  });
  it('sends signed-in users without onboarding to onboarding', () => {
    expect(getGateRedirect(fresh, ['(auth)'])).toBe('/onboarding');
    expect(getGateRedirect(fresh, ['(app)', '(tabs)', 'networks'])).toBe('/onboarding');
    expect(getGateRedirect(fresh, ['(app)', 'onboarding'])).toBeNull();
  });
  it('sends onboarded users out of (auth) and lets them through the app', () => {
    expect(getGateRedirect(done, ['(auth)', 'login'])).toBe('/networks');
    expect(getGateRedirect(done, ['(app)', '(tabs)', 'search'])).toBeNull();
    expect(getGateRedirect(done, ['(app)', 'onboarding'])).toBeNull();
  });
});
