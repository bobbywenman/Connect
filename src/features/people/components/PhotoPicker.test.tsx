import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { preparePhoto, type PhotoChange } from '../photos';
import { PhotoPicker } from './PhotoPicker';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../photos', () => ({
  ...jest.requireActual('../photos'),
  preparePhoto: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);
const prepare = jest.mocked(preparePhoto);

async function setup(props: Partial<React.ComponentProps<typeof PhotoPicker>> = {}) {
  const onChange = jest.fn<void, [PhotoChange]>();
  await render(
    <PhotoPicker firstName="Ana" change={{ kind: 'unchanged' }} onChange={onChange} {...props} />,
  );
  return { onChange };
}

const openMenu = () => fireEvent.press(screen.getByLabelText('Change photo'));
const granted = { granted: true, canAskAgain: true } as ImagePicker.PermissionResponse;
const denied = { granted: false, canAskAgain: false } as ImagePicker.PermissionResponse;

beforeEach(() => {
  jest.clearAllMocks();
  prepare.mockResolvedValue('file:///prepared.jpg');
});

describe('PhotoPicker', () => {
  it('offers take, choose and cancel; remove only when a photo exists', async () => {
    await setup();
    await openMenu();
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Choose from library' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove photo' })).toBeNull();
  });

  it('shows Remove photo when a photo is saved and reports a remove change', async () => {
    const { onChange } = await setup({ hasSavedPhoto: true, savedUrl: 'https://s/a.jpg' });
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove photo' }));
    expect(onChange).toHaveBeenCalledWith({ kind: 'remove' });
  });

  it('picks from the library with a square editor and reports the prepared image', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///raw.png', width: 800, height: 600 }],
    } as ImagePicker.ImagePickerResult);
    const { onChange } = await setup();
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from library' }));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ kind: 'set', uri: 'file:///prepared.jpg' }),
    );
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }),
    );
    expect(prepare).toHaveBeenCalledWith('file:///raw.png', { width: 800, height: 600 });
  });

  it('does nothing when the picker is cancelled', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    } as ImagePicker.ImagePickerResult);
    const { onChange } = await setup();
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(() => expect(picker.launchCameraAsync).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains a denied camera permission and offers Settings, without launching', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(denied);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { onChange } = await setup();
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText(/needs camera access/)).toBeOnTheScreen();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalled();
  });

  it('shows a message instead of crashing when the library throws', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockRejectedValue(new Error('boom'));
    await setup();
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from library' }));
    expect(await screen.findByText(/Couldn't use that photo/)).toBeOnTheScreen();
  });
});
