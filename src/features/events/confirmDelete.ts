import { Alert, Platform } from 'react-native';

/** Ask whether to delete an event. Resolves true when the user confirms. */
export function confirmDeleteEvent(eventName: string): Promise<boolean> {
  const title = 'Delete this event?';
  const message = `"${eventName}" will be removed. The people who were added to it are kept.`;
  if (Platform.OS === 'web') {
    // Alert.alert is a no-op on react-native-web.
    return Promise.resolve(window.confirm(`${title}\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
