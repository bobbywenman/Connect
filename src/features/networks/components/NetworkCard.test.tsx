import { fireEvent, render, screen } from '@testing-library/react-native';

import { networkColors } from '@/constants';

import type { NetworkSummary } from '../api';
import { NetworkCard } from './NetworkCard';

const network: NetworkSummary = {
  id: 'n1',
  name: 'Wenman Family',
  type: 'family',
  color: 'green',
  description: null,
  personCount: 8,
};

describe('NetworkCard', () => {
  it('shows name, type, count and an accessible label', async () => {
    await render(<NetworkCard network={network} onPress={jest.fn()} />);
    expect(screen.getByText('Wenman Family')).toBeOnTheScreen();
    expect(screen.getByText('Family · 8 people')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Wenman Family, Family network, 8 people' }),
    ).toBeOnTheScreen();
  });

  it('uses the singular for one person', async () => {
    await render(<NetworkCard network={{ ...network, personCount: 1 }} onPress={jest.fn()} />);
    expect(screen.getByText('Family · 1 person')).toBeOnTheScreen();
  });

  it('paints the bar with the stored color, gray when unknown', async () => {
    const green = networkColors.find((c) => c.name === 'green')?.value;
    const gray = networkColors.find((c) => c.name === 'gray')?.value;
    const { rerender } = await render(<NetworkCard network={network} onPress={jest.fn()} />);
    expect(screen.getByTestId('network-color-bar')).toHaveStyle({ backgroundColor: green });
    await rerender(<NetworkCard network={{ ...network, color: '#E07A5F' }} onPress={jest.fn()} />);
    expect(screen.getByTestId('network-color-bar')).toHaveStyle({ backgroundColor: gray });
  });

  it('calls onPress with the network', async () => {
    const onPress = jest.fn();
    await render(<NetworkCard network={network} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(network);
  });
});
