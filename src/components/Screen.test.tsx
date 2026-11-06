import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from '@/components';

describe('Screen', () => {
  it('renders children', async () => {
    await render(
      <Screen>
        <Text>Content</Text>
      </Screen>,
    );
    expect(screen.getByText('Content')).toBeOnTheScreen();
  });

  it('renders children inside a scroll view when scroll is set', async () => {
    await render(
      <Screen scroll>
        <Text>Scrolling</Text>
      </Screen>,
    );
    expect(screen.getByText('Scrolling')).toBeOnTheScreen();
  });
});
