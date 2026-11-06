import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, radii, spacing } from '@/constants';

export interface BadgeProps {
  label: string;
  /** Background color; defaults to primary. White text is used on top. */
  color?: string;
}

export function Badge({ label, color = colors.primary }: BadgeProps) {
  return (
    <View accessible accessibilityLabel={label} style={[styles.badge, { backgroundColor: color }]}>
      <Text importantForAccessibility="no" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  label: { color: colors.textOnPrimary, fontSize: fontSizes.xs, fontWeight: fontWeights.medium },
});
