import { fireEvent, render, screen } from '@testing-library/react-native';

import { PeopleFilterSheet, type PeopleFilterSheetProps } from './PeopleFilterSheet';

function setup(overrides: Partial<PeopleFilterSheetProps> = {}) {
  const props: PeopleFilterSheetProps = {
    visible: true,
    onClose: jest.fn(),
    tags: ['Gym', 'Work'],
    relationshipTypes: ['cousin', 'coworker'],
    selectedTags: [],
    selectedTypes: [],
    onToggleTag: jest.fn(),
    onToggleType: jest.fn(),
    onClearAll: jest.fn(),
    resultCount: 5,
    ...overrides,
  };
  return props;
}

describe('PeopleFilterSheet', () => {
  it('toggles tags and relationship types', async () => {
    const props = setup();
    await render(<PeopleFilterSheet {...props} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tag Gym' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Relationship Cousin' }));
    expect(props.onToggleTag).toHaveBeenCalledWith('Gym');
    expect(props.onToggleType).toHaveBeenCalledWith('cousin');
  });

  it('marks selected chips as checked', async () => {
    await render(<PeopleFilterSheet {...setup({ selectedTags: ['Work'] })} />);
    expect(screen.getByRole('checkbox', { name: 'Tag Work' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Tag Gym' })).not.toBeChecked();
  });

  it('disables Clear all until something is selected, then calls it', async () => {
    const empty = setup();
    const { unmount } = await render(<PeopleFilterSheet {...empty} />);
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
    await unmount();

    const props = setup({ selectedTypes: ['cousin'] });
    await render(<PeopleFilterSheet {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear all' }));
    expect(props.onClearAll).toHaveBeenCalledTimes(1);
  });

  it('shows the live result count and closes from it', async () => {
    const props = setup({ resultCount: 1 });
    await render(<PeopleFilterSheet {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show 1 person' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('explains when there is nothing to filter by', async () => {
    await render(<PeopleFilterSheet {...setup({ tags: [], relationshipTypes: [] })} />);
    expect(screen.getByText('No tags in this network yet.')).toBeOnTheScreen();
    expect(screen.getByText('No relationships in this network yet.')).toBeOnTheScreen();
  });
});
