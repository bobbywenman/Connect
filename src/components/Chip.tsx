import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

export interface ChipProps {
  label: string;
  onRemove?: () => void;
}

const REMOVE_SIZE = 24;

export function Chip({ label, onRemove }: ChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={onRemove}
          hitSlop={(minTapTarget - REMOVE_SIZE) / 2}
          style={styles.remove}
        >
          <Text importantForAccessibility="no" style={styles.removeIcon}>
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: { fontSize: fontSizes.sm, color: colors.text },
  remove: {
    width: REMOVE_SIZE,
    height: REMOVE_SIZE,
    borderRadius: REMOVE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
});
