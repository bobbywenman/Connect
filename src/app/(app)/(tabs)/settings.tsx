import { StyleSheet, View } from 'react-native';

import { Button, Screen } from '@/components';
import { spacing } from '@/constants';
import { mapAuthError } from '@/features/auth/errors';
import { FormError } from '@/features/auth/FormError';
import { useSignOut } from '@/features/auth/hooks';
import { DevReminderTest } from '@/features/notifications/components/DevReminderTest';
import { MyProfileRow } from '@/features/profile/components/MyProfileRow';

export default function SettingsScreen() {
  const signOut = useSignOut();
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={styles.section}>
        <MyProfileRow />
      </View>
      {__DEV__ ? (
        <View style={styles.section}>
          <DevReminderTest />
        </View>
      ) : null}
      <View style={styles.actions}>
        {/* Signing out clears the session; the route gate then returns to welcome. */}
        <Button
          label="Sign out"
          variant="danger"
          isLoading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
        <FormError message={signOut.error ? mapAuthError(signOut.error) : null} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
});
