import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { NetworkSummary } from '@/features/networks/api';

import { confirmDiscard } from '../confirmDiscard';
import { emptyPersonForm, type PersonFormInput } from '../schemas';
import { PersonForm, type PersonFormProps } from './PersonForm';

jest.mock('../confirmDiscard', () => ({ confirmDiscard: jest.fn() }));
const mockConfirmDiscard = jest.mocked(confirmDiscard);

const networks: NetworkSummary[] = [
  { id: 'n1', name: 'Family', type: 'family', color: 'orange', description: null, personCount: 2 },
  { id: 'n2', name: 'Work', type: 'work', color: 'blue', description: null, personCount: 1 },
];

async function setup(props: Partial<PersonFormProps> & { values?: Partial<PersonFormInput> } = {}) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  const { values, ...rest } = props;
  await render(
    <PersonForm
      title="New person"
      initialValues={{ ...emptyPersonForm, networkIds: ['n1'], ...values }}
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
});

describe('PersonForm', () => {
  it('shows a required error and does not submit without a first name', async () => {
    const { onSubmit } = await setup();
    await save();
    expect(await screen.findByText('First name is required')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with only a first name (empty optionals become null)', async () => {
    const { onSubmit } = await setup();
    await fireEvent.changeText(screen.getByLabelText('First name *'), '  Jamie ');
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      firstName: 'Jamie',
      lastName: null,
      networkIds: ['n1'],
      tags: [],
      birthdate: null,
    });
  });

  it('keeps Basic open and the other sections collapsed, and toggles them', async () => {
    await setup();
    expect(screen.getByLabelText('First name *')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Pronouns')).toBeNull();

    const personal = screen.getByRole('button', { name: 'Personal' });
    expect(personal).toBeCollapsed();
    await fireEvent.press(personal);
    expect(screen.getByRole('button', { name: 'Personal' })).toBeExpanded();
    expect(screen.getByLabelText('Pronouns')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Personal' }));
    expect(screen.queryByLabelText('Pronouns')).toBeNull();
  });

  it('starts sections open when they already hold data', async () => {
    await setup({ values: { firstName: 'Ana', jobTitle: 'Nurse' } });
    expect(screen.getByRole('button', { name: 'Work' })).toBeExpanded();
    expect(screen.getByLabelText('Job title').props.value).toBe('Nurse');
    expect(screen.getByRole('button', { name: 'Location' })).toBeCollapsed();
  });

  it('adds tag chips on comma and return, dedupes ignoring case, and removes chips', async () => {
    const { onSubmit } = await setup({ values: { firstName: 'Jamie' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Notes & tags' }));
    const input = screen.getByLabelText('Groups & tags');

    await fireEvent.changeText(input, 'Golf,');
    expect(screen.getByText('Golf')).toBeOnTheScreen();
    expect(input.props.value).toBe('');

    await fireEvent.changeText(input, 'golf');
    await fireEvent(input, 'submitEditing');
    await fireEvent.changeText(input, 'Book club, Chess');
    await fireEvent(input, 'submitEditing');

    expect(screen.getAllByText(/^golf$/i)).toHaveLength(1);
    expect(screen.getByText('Book club')).toBeOnTheScreen();
    expect(screen.getByText('Chess')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove Book club' }));
    expect(screen.queryByText('Book club')).toBeNull();

    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].tags).toEqual(['Golf', 'Chess']);
  });

  it('rejects an over-long tag with a message', async () => {
    await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Notes & tags' }));
    await fireEvent.changeText(screen.getByLabelText('Groups & tags'), `${'x'.repeat(31)},`);
    expect(screen.getByText('Tags must be 30 characters or fewer')).toBeOnTheScreen();
  });

  it('toggles network chips and requires at least one', async () => {
    const { onSubmit } = await setup({ values: { firstName: 'Jamie', networkIds: [] } });
    const family = screen.getByRole('checkbox', { name: 'Family' });
    const work = screen.getByRole('checkbox', { name: 'Work' });
    expect(family).not.toBeChecked();

    await save();
    expect(await screen.findByText('Pick at least one network')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(family);
    await fireEvent.press(work);
    expect(screen.getByRole('checkbox', { name: 'Family' })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Family' }));
    expect(screen.getByRole('checkbox', { name: 'Family' })).not.toBeChecked();

    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].networkIds).toEqual(['n2']);
  });

  it('hides the network picker for the self person and needs no network', async () => {
    const { onSubmit } = await setup({
      isSelf: true,
      values: { firstName: 'Me', networkIds: [] },
    });
    expect(screen.queryByText('Networks *')).toBeNull();
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('opens a collapsed section that has a validation error on save', async () => {
    await setup({ values: { firstName: 'Jamie', birthdate: 'nope' } });
    // birthdate is pre-filled, so Personal starts open; collapse it, then save.
    await fireEvent.press(screen.getByRole('button', { name: 'Personal' }));
    expect(screen.queryByLabelText('Pronouns')).toBeNull();
    await save();
    expect(await screen.findByText('Birthday must be a date like 1990-04-23')).toBeOnTheScreen();
  });

  it('disables the reminder switch until there is a date', async () => {
    await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Personal' }));
    expect(screen.getByLabelText('Remind me about this birthday')).toBeDisabled();
  });

  it('cancels straight away when nothing changed', async () => {
    const { onCancel } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(mockConfirmDiscard).not.toHaveBeenCalled();
  });

  it('confirms before discarding edits, and respects the answer', async () => {
    const { onCancel } = await setup();
    await fireEvent.changeText(screen.getByLabelText('First name *'), 'Jam');

    mockConfirmDiscard.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => {});
    expect(onCancel).not.toHaveBeenCalled();

    mockConfirmDiscard.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it('shows a busy, disabled Save while saving, and a save error', async () => {
    await setup({ isSaving: true, submitError: 'Could not save' });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('Could not save')).toBeOnTheScreen();
  });

  it('shows initials in the photo slot and a disabled photo note', async () => {
    await setup({ values: { firstName: 'Jamie', lastName: 'Lee' } });
    expect(screen.getByText('JL')).toBeOnTheScreen();
    expect(screen.getByLabelText('Change photo')).toBeOnTheScreen();
  });
});
