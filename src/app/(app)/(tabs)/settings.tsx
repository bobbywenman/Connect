import { StyleSheet, View } from 'react-native';

import { Button } from '@/components';
import { spacing } from '@/constants';
import { mapAuthError } from '@/features/auth/errors';
import { FormError } from '@/features/auth/FormError';
import { useSignOut } from '@/features/auth/hooks';
import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';

export default function SettingsScreen() {
  const signOut = useSignOut();
  return (
    <ScreenPlaceholder title="Settings">
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
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  actions: { alignSelf: 'stretch', gap: spacing.sm },
});
