import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components';

describe('Button', () => {
  it('renders its label as an accessible button and handles press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('renders %s variant', async (v) => {
    await render(<Button label="Go" variant={v} />);
    expect(screen.getByText('Go')).toBeOnTheScreen();
  });

  it('shows a spinner and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" isLoading onPress={onPress} />);
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    expect(screen.queryByText('Save')).toBeNull();
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not press when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
