import { fireEvent, render, screen } from '@testing-library/react-native';

import { networkColors } from '@/constants';

import { NetworkForm } from './NetworkForm';

const onSubmit = jest.fn();

beforeEach(() => onSubmit.mockClear());

describe('NetworkForm', () => {
  it('blocks submit and shows an inline error when the name is empty', async () => {
    await render(<NetworkForm submitLabel="Create network" onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    expect(screen.getByText('Enter a name for this network')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the error once the name is fixed', async () => {
    await render(<NetworkForm submitLabel="Create network" onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Book Club');
    expect(screen.queryByText('Enter a name for this network')).not.toBeOnTheScreen();
  });

  it('rejects names over 50 characters', async () => {
    await render(<NetworkForm submitLabel="Create network" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'a'.repeat(51));
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    expect(screen.getByText('Use 50 characters or fewer')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed name, chosen type and color', async () => {
    await render(<NetworkForm submitLabel="Create network" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), '  Book Club ');
    await fireEvent.press(screen.getByRole('radio', { name: 'Friends' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'teal' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create network' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Book Club', type: 'friends', color: 'teal' });
  });

  it('offers every type and all eight colors with accessible labels', async () => {
    await render(<NetworkForm submitLabel="Save" onSubmit={onSubmit} />);
    for (const label of ['Family', 'Friends', 'Work', 'Custom']) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
    expect(networkColors).toHaveLength(8);
    for (const c of networkColors) {
      expect(screen.getByRole('radio', { name: c.name })).toBeOnTheScreen();
    }
  });

  it('marks exactly one type and one color as selected, with a check mark on the color', async () => {
    await render(
      <NetworkForm
        submitLabel="Save"
        onSubmit={onSubmit}
        initialValues={{ name: 'Work crew', type: 'work', color: 'purple' }}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Work' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Family' })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: 'purple' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'blue' })).not.toBeSelected();
    expect(screen.getByTestId('swatch-check-purple')).toBeOnTheScreen();
    expect(screen.queryByTestId('swatch-check-blue')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'orange' }));
    expect(screen.getByRole('radio', { name: 'orange' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'purple' })).not.toBeSelected();
    expect(screen.queryByTestId('swatch-check-purple')).not.toBeOnTheScreen();
    expect(screen.getByTestId('swatch-check-orange')).toBeOnTheScreen();
  });

  it('previews the name and color live', async () => {
    await render(<NetworkForm submitLabel="Save" onSubmit={onSubmit} />);
    expect(screen.getByText('Network name')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Book Club');
    await fireEvent.press(screen.getByRole('radio', { name: 'teal' }));
    expect(screen.getByText('Book Club', { exact: true, hidden: false })).toBeOnTheScreen();
    const teal = networkColors.find((c) => c.name === 'teal')?.value;
    expect(screen.getByTestId('network-preview-bar')).toHaveStyle({ backgroundColor: teal });
  });

  it('shows a save error and renders the footer', async () => {
    await render(
      <NetworkForm
        submitLabel="Save"
        onSubmit={onSubmit}
        submitError="Couldn't save"
        footer={<></>}
      />,
    );
    expect(screen.getByText("Couldn't save")).toBeOnTheScreen();
  });
});
