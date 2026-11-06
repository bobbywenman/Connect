import { StyleSheet, Text } from 'react-native';

import { colors, fontSizes, spacing } from '@/constants';

/** Form-level message area. Always mounted so screen readers announce changes. */
export function FormError({ message }: { message?: string | null }) {
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
      {message ?? ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: fontSizes.sm, color: colors.error, minHeight: spacing.base },
});
