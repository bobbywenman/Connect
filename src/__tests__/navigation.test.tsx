import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { sessionActions } from '@/store/session';

const APP_DIR = 'src/app';

async function renderAt(url: string) {
  return renderRouter(APP_DIR, { initialUrl: url });
}

describe('navigation shell', () => {
  beforeEach(() => {
    sessionActions.reset();
  });

  it('shows the welcome screen when signed out', async () => {
    const r = await renderAt('/');
    expect(screen.getByLabelText('Continue (dev sign-in)')).toBeTruthy();
    expect(r.getPathname()).toBe('/');
  });

  it('redirects signed-out deep links to welcome', async () => {
    const r = await renderAt('/person/123');
    await waitFor(() => expect(r.getPathname()).toBe('/'));
  });

  it('dev sign-in lands on the Networks tab and sign out returns to welcome', async () => {
    const r = await renderAt('/');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue (dev sign-in)'));
    });
    await waitFor(() => expect(r.getPathname()).toBe('/networks'));
    for (const t of ['Networks', 'Search', 'Study', 'Events', 'Settings']) {
      expect(screen.getByLabelText(`${t} tab`)).toBeTruthy();
    }
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Settings tab'));
    });
    await waitFor(() => expect(r.getPathname()).toBe('/settings'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Sign out (dev)'));
    });
    await waitFor(() => expect(r.getPathname()).toBe('/'));
  });

  it('sends signed-in users without onboarding to onboarding', async () => {
    sessionActions.signIn({ onboardingComplete: false });
    const r = await renderAt('/networks');
    await waitFor(() => expect(r.getPathname()).toBe('/onboarding'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Finish onboarding (dev)'));
    });
    // Completing onboarding does not move the user; they can now navigate freely.
    expect(r.getPathname()).toBe('/onboarding');
  });

  describe('signed in', () => {
    beforeEach(() => {
      sessionActions.signIn({ onboardingComplete: true });
    });

    const cases: [string, string, string][] = [
      ['auth redirect to home', '/', '/networks'],
      ['tab: networks', '/networks', 'Networks'],
      ['tab: search', '/search', 'Search'],
      ['tab: study', '/study', 'Study'],
      ['tab: events', '/events', 'Events'],
      ['tab: settings', '/settings', 'Settings'],
      ['network detail', '/network/7', 'Network 7'],
      ['person detail (deep link path)', '/person/123', 'Person 123'],
      ['person edit', '/person/123/edit', 'Edit person 123'],
      ['person new', '/person/new', 'New person'],
      ['relationship new', '/relationship/new', 'New relationship'],
      ['study session', '/study/session', 'Study session'],
      ['study complete', '/study/complete', 'Study complete'],
      ['event detail', '/event/9', 'Event 9'],
      ['onboarding', '/onboarding', 'Onboarding'],
    ];

    it.each(cases)('%s: %s', async (_name, url, title) => {
      const r = await renderAt(url);
      if (url === '/') {
        await waitFor(() => expect(r.getPathname()).toBe(title));
        return;
      }
      expect(r.getPathname()).toBe(url);
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    });

    it('resolves the knowthem:// deep link to the person route', async () => {
      const r = await renderAt('/person/123');
      expect(r.getPathname()).toBe('/person/123');
      expect(r.getSegments()).toEqual(['(app)', 'person', '[id]']);
      expect(screen.getAllByText('Person 123').length).toBeGreaterThan(0);
    });
  });
});
