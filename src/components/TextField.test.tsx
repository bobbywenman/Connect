import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from '@/components';

describe('TextField', () => {
  it('renders label, placeholder and is findable by label', async () => {
    await render(<TextField label="First name" placeholder="Ada" />);
    expect(screen.getByText('First name')).toBeOnTheScreen();
    expect(screen.getByLabelText('First name')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Ada')).toBeOnTheScreen();
  });

  it('reports text changes', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Name" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Grace');
    expect(onChangeText).toHaveBeenCalledWith('Grace');
  });

  it('shows the error message below the field', async () => {
    await render(<TextField label="Email" error="Enter a valid email" />);
    expect(screen.getByText('Enter a valid email')).toBeOnTheScreen();
  });

  it('shows no error text when valid', async () => {
    await render(<TextField label="Email" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('supports secureTextEntry and multiline', async () => {
    await render(
      <>
        <TextField label="Password" secureTextEntry />
        <TextField label="Notes" multiline />
      </>,
    );
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('Notes').props.multiline).toBe(true);
  });
});
