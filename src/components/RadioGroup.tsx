import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

export interface RadioOption<T extends string | number> {
  value: T;
  label: string;
}

export interface RadioGroupProps<T extends string | number> {
  /** Names the group for screen readers, e.g. "Remind me". */
  label: string;
  options: readonly RadioOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

/** A single-choice list. The selected row shows a check mark as well as bold text, not colour alone. */
export function RadioGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => (
        <RadioRow
          key={String(option.value)}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

interface RadioRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function RadioRow({ label, selected, onPress }: RadioRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {selected ? (
        <Text importantForAccessibility="no" style={styles.check}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  row: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: fontSizes.base, color: colors.text },
  labelSelected: { fontWeight: fontWeights.bold },
  check: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.primary },
});
