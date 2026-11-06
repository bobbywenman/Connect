import { StyleSheet, Text } from 'react-native';

import { colors, fontSizes, fontWeights, spacing } from '@/constants';

export interface BrandTitleProps {
  subtitle?: string;
}

/** App wordmark. */
export function BrandTitle({ subtitle }: BrandTitleProps) {
  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        KnowThem
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.primary },
  subtitle: { fontSize: fontSizes.base, color: colors.textSecondary, marginTop: spacing.sm },
});
