import { Alert, Platform } from 'react-native';

/** Ask whether to throw away unsaved edits. Resolves true when the user chooses to discard. */
export function confirmDiscard(): Promise<boolean> {
  const title = 'Discard changes?';
  const message = 'You have unsaved changes that will be lost.';
  if (Platform.OS === 'web') {
    // Alert.alert is a no-op on react-native-web.
    return Promise.resolve(window.confirm(`${title}\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Keep editing', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Discard', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
