import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState } from '@/components';

describe('EmptyState', () => {
  it('renders without a CTA', async () => {
    await render(<EmptyState title="No people yet" subtitle="Add someone to begin" />);
    expect(screen.getByRole('header')).toHaveTextContent('No people yet');
    expect(screen.getByText('Add someone to begin')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the icon slot', async () => {
    await render(<EmptyState title="Empty" icon={<Text>ICON</Text>} />);
    expect(screen.getByText('ICON', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('renders and fires the CTA', async () => {
    const onCtaPress = jest.fn();
    await render(
      <EmptyState title="No people yet" ctaLabel="Add person" onCtaPress={onCtaPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Add person' }));
    expect(onCtaPress).toHaveBeenCalledTimes(1);
  });
});
