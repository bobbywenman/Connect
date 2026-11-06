import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { queryKeys } from '@/lib/queryKeys';
import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { EditNetworkScreen } from './EditNetworkScreen';
import { NewNetworkScreen } from './NewNetworkScreen';

const mockRouter = {
  back: jest.fn(),
  replace: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'n1' }),
}));

async function renderWithClient(ui: ReactElement, client = new QueryClient()) {
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { client };
}

beforeEach(() => {
  fakeSupabase.reset();
  Object.values(mockRouter).forEach((fn) => fn.mockClear());
  mockRouter.canGoBack.mockReturnValue(true);
});

describe('NewNetworkScreen', () => {
  it('creates the network, refreshes the list and goes back', async () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.networks.all, []);
    const spy = jest.spyOn(client, 'invalidateQueries');
    await renderWithClient(<NewNetworkScreen />, client);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Book Club');
    await fireEvent.press(screen.getByRole('radio', { name: 'Friends' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'teal' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(fakeSupabase.getNetworks()).toEqual([
      { id: 'net-1', name: 'Book Club', type: 'friends', color: 'teal', description: null },
    ]);
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.networks.all });
  });

  it('does not save with an empty name', async () => {
    await renderWithClient(<NewNetworkScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    expect(screen.getByText('Enter a name for this network')).toBeOnTheScreen();
    expect(fakeSupabase.getNetworks()).toEqual([]);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows an error and stays open when saving fails', async () => {
    fakeSupabase.setNetworksError(new Error('boom'));
    await renderWithClient(<NewNetworkScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Book Club');
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    expect(await screen.findByText(/Couldn't create the network/)).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('falls back to the home tab when there is nothing to go back to', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await renderWithClient(<NewNetworkScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Book Club');
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/networks'));
  });
});

describe('EditNetworkScreen', () => {
  beforeEach(() => {
    fakeSupabase.setNetworks([
      { id: 'n1', name: 'Wenman Family', type: 'family', color: 'orange', onlyPeople: 3 },
    ]);
  });

  it('loads the network into the form and saves changes', async () => {
    await renderWithClient(<EditNetworkScreen />);
    const name = await screen.findByLabelText('Name');
    expect(name.props.value).toBe('Wenman Family');
    expect(screen.getByRole('radio', { name: 'Family' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'orange' })).toBeSelected();

    await fireEvent.changeText(name, 'Wenmans');
    await fireEvent.press(screen.getByRole('radio', { name: 'green' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(fakeSupabase.getNetworks()[0]).toMatchObject({ name: 'Wenmans', color: 'green' });
  });

  it('shows a not-found message for a missing network', async () => {
    fakeSupabase.setNetworks([]);
    await renderWithClient(<EditNetworkScreen />);
    expect(await screen.findByText('This network no longer exists')).toBeOnTheScreen();
  });

  it('asks before deleting and states exactly what will be removed', async () => {
    await renderWithClient(<EditNetworkScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete network' }));

    expect(await screen.findByText('Delete ‘Wenman Family’?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "This removes the network and its 3 people who aren't in any other network. People in other networks are kept.",
      ),
    ).toBeOnTheScreen();
    // Nothing is deleted until confirmed.
    expect(fakeSupabase.getNetworks()).toHaveLength(1);
  });

  it('cancelling keeps the network', async () => {
    await renderWithClient(<EditNetworkScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete network' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));
    expect(fakeSupabase.getNetworks()).toHaveLength(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(/This removes the network/)).toBeNull());
  });

  it('confirming deletes the network and goes home', async () => {
    const { client } = await renderWithClient(<EditNetworkScreen />);
    const spy = jest.spyOn(client, 'invalidateQueries');
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete network' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/networks'));
    expect(fakeSupabase.getNetworks()).toEqual([]);
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.networks.all });
  });
});
