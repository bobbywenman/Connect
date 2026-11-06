import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from './ConfirmDialog';

const base = {
  title: 'Delete it?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('ConfirmDialog', () => {
  it('shows nothing when not visible', async () => {
    await render(<ConfirmDialog {...base} visible={false} />);
    expect(screen.queryByText('Delete it?')).not.toBeOnTheScreen();
  });

  it('shows title and message and wires confirm and cancel', async () => {
    await render(<ConfirmDialog {...base} visible />);
    expect(screen.getByText('Delete it?')).toBeOnTheScreen();
    expect(screen.getByText('This cannot be undone.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(base.onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(base.onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog neutral action', () => {
  it('renders a third button only when label and handler are given', async () => {
    const onNeutral = jest.fn();
    await render(<ConfirmDialog {...base} visible neutralLabel="Review" onNeutral={onNeutral} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    expect(onNeutral).toHaveBeenCalledTimes(1);
    expect(base.onCancel).not.toHaveBeenCalled();
    expect(base.onConfirm).not.toHaveBeenCalled();
  });

  it('has no third button by default', async () => {
    await render(<ConfirmDialog {...base} visible />);
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
  });
});
