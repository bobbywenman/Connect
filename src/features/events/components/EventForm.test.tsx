import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import type { NetworkSummary } from '@/features/networks/api';
import { confirmDiscard } from '@/features/people/confirmDiscard';

import { emptyEventForm, type EventFormInput } from '../schemas';
import { EventForm, type EventFormProps } from './EventForm';

jest.mock('@/features/people/confirmDiscard', () => ({ confirmDiscard: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));
const mockConfirmDiscard = jest.mocked(confirmDiscard);

const networks: NetworkSummary[] = [
  { id: 'n1', name: 'Family', type: 'family', color: 'orange', description: null, personCount: 2 },
  { id: 'n2', name: 'Work', type: 'work', color: 'blue', description: null, personCount: 1 },
];

async function setup(props: Partial<EventFormProps> & { values?: Partial<EventFormInput> } = {}) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  const { values, ...rest } = props;
  await render(
    <EventForm
      title="New event"
      initialValues={{ ...emptyEventForm, ...values }}
      networks={networks}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...rest}
    />,
  );
  return { onSubmit, onCancel };
}

const save = () => fireEvent.press(screen.getByRole('button', { name: 'Save' }));

beforeEach(() => {
  mockConfirmDiscard.mockReset();
  // The web date field is a plain text input, which the tests can type into.
  jest.replaceProperty(Platform, 'OS', 'web');
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('EventForm', () => {
  it('requires a name and a date', async () => {
    const { onSubmit } = await setup();
    await save();
    expect(await screen.findByText('Name is required')).toBeOnTheScreen();
    expect(screen.getByText('Date is required')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a name over 80 characters and a description over 1000', async () => {
    const { onSubmit } = await setup({
      values: { name: 'a'.repeat(81), eventDate: '2026-12-20', description: 'b'.repeat(1001) },
    });
    await save();
    expect(await screen.findByText('Name must be 80 characters or fewer')).toBeOnTheScreen();
    expect(screen.getByText('Description must be 1000 characters or fewer')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a date that is not real', async () => {
    await setup({ values: { name: 'Party', eventDate: '2026-02-30' } });
    await save();
    expect(await screen.findByText(/Date must be a real date/)).toBeOnTheScreen();
  });

  it('submits name and date only, with empty optionals as null', async () => {
    const { onSubmit } = await setup();
    await fireEvent.changeText(screen.getByLabelText('Name *'), '  Thanksgiving dinner ');
    await fireEvent.changeText(screen.getByLabelText('Date * (YYYY-MM-DD)'), '2026-11-26');
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      name: 'Thanksgiving dinner',
      eventDate: '2026-11-26',
      location: null,
      description: null,
      networkId: null,
    });
  });

  it('submits location, description and a chosen network, and can unlink it', async () => {
    const { onSubmit } = await setup({ values: { name: 'Reunion', eventDate: '2026-12-20' } });
    await fireEvent.changeText(screen.getByLabelText('Location'), 'Bend, OR');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'Big one');
    await fireEvent.press(screen.getByRole('radio', { name: 'Family' }));
    expect(screen.getByRole('radio', { name: 'Family' })).toBeChecked();
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      location: 'Bend, OR',
      description: 'Big one',
      networkId: 'n1',
    });

    await fireEvent.press(screen.getByRole('radio', { name: 'None' }));
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]![0]).toMatchObject({ networkId: null });
  });

  it('preselects the saved network', async () => {
    await setup({ values: { name: 'Reunion', eventDate: '2026-12-20', networkId: 'n2' } });
    expect(screen.getByRole('radio', { name: 'Work' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'None' })).not.toBeChecked();
  });

  it('cancels straight away when nothing changed, and confirms when dirty', async () => {
    const { onCancel } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockConfirmDiscard).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Name *'), 'Draft');
    mockConfirmDiscard.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(mockConfirmDiscard).toHaveBeenCalledTimes(1));
    expect(onCancel).toHaveBeenCalledTimes(1);

    mockConfirmDiscard.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(2));
  });

  it('shows a save error', async () => {
    await setup({ submitError: "Couldn't save." });
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save.");
  });
});
