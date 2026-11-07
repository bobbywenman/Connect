import { fireEvent, render, screen } from '@testing-library/react-native';

import { RadioGroup } from './RadioGroup';

const options = [
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day before' },
];

describe('RadioGroup', () => {
  it('exposes a labelled radio group with one checked radio', async () => {
    await render(<RadioGroup label="Remind me" options={options} value={1} onChange={jest.fn()} />);

    expect(screen.getByLabelText('Remind me')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '1 day before' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Same day' })).not.toBeChecked();
  });

  it('shows a check mark on the selected row, not only colour', async () => {
    await render(<RadioGroup label="Remind me" options={options} value={0} onChange={jest.fn()} />);

    const selected = screen.getByRole('radio', { name: 'Same day' });
    expect(selected).toHaveTextContent(/✓/);
    expect(screen.getByRole('radio', { name: '1 day before' })).not.toHaveTextContent(/✓/);
  });

  it('calls onChange with the chosen value', async () => {
    const onChange = jest.fn();
    await render(<RadioGroup label="Remind me" options={options} value={0} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: '1 day before' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
