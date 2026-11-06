import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components';
import { spacing } from '@/constants';

/** Shared frame for the auth screens: safe area, scrolling and keyboard avoidance. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <Screen scroll>
        <View style={styles.form}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.base, paddingVertical: spacing.lg },
});
