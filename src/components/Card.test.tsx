import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '@/components';

describe('Card', () => {
  it('renders children', async () => {
    await render(
      <Card>
        <Text>Hello</Text>
      </Card>,
    );
    expect(screen.getByText('Hello')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is a pressable button when onPress is given', async () => {
    const onPress = jest.fn();
    await render(
      <Card onPress={onPress} accessibilityLabel="Open Ada">
        <Text>Ada</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Open Ada' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
