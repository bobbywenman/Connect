import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DateField } from './DateField';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

describe('DateField on web', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is a YYYY-MM-DD text field that can be cleared', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Birthday" value="1990-04-23" onChange={onChange} />);
    const input = screen.getByLabelText('Birthday (YYYY-MM-DD)');
    expect(input.props.value).toBe('1990-04-23');
    await fireEvent.changeText(input, '');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows the error', async () => {
    await render(<DateField label="Birthday" value="x" onChange={jest.fn()} error="Bad date" />);
    expect(screen.getByText('Bad date')).toBeOnTheScreen();
  });
});

describe('DateField on native', () => {
  it('shows Not set, and a Clear button once there is a date', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<DateField label="Birthday" value="" onChange={onChange} />);
    expect(screen.getByText('Not set')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Clear Birthday' })).toBeNull();

    await rerender(<DateField label="Birthday" value="1990-04-23" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear Birthday' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
