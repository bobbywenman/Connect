import { Pressable, StyleSheet, Text } from 'react-native';

import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';
import { sessionActions } from '@/store/session';

export default function SettingsScreen() {
  return (
    <ScreenPlaceholder title="Settings">
      {/* TEMPORARY: dev shortcut, removed when real sign-out lands in KT-07. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out (dev)"
        style={styles.button}
        onPress={() => sessionActions.signOut()}
      >
        <Text style={styles.buttonText}>Sign out (dev)</Text>
      </Pressable>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 16, color: '#1E3A5F' },
});
