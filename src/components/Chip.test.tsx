import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from '@/components';

describe('Chip', () => {
  it('renders without a remove button by default', async () => {
    await render(<Chip label="golf" />);
    expect(screen.getByText('golf')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onRemove from a button labelled "Remove <label>"', async () => {
    const onRemove = jest.fn();
    await render(<Chip label="golf" onRemove={onRemove} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove golf' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
