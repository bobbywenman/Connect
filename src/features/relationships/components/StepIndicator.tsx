import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, radii, spacing } from '@/constants';

export const FLOW_STEPS = ['Person', 'Type', 'Review'] as const;

export interface StepIndicatorProps {
  /** 1-based. */
  step: 1 | 2 | 3;
}

/** "Step 2 of 3 · Type" with three bars. The text says it, so color is not the only signal. */
export function StepIndicator({ step }: StepIndicatorProps) {
  const name = FLOW_STEPS[step - 1];
  return (
    <View
      accessible
      accessibilityLabel={`Step ${step} of ${FLOW_STEPS.length}: ${name}`}
      style={styles.container}
    >
      <View style={styles.bars}>
        {FLOW_STEPS.map((label, i) => (
          <View key={label} style={[styles.bar, i < step && styles.barDone]} />
        ))}
      </View>
      <Text importantForAccessibility="no" style={styles.text}>
        Step {step} of {FLOW_STEPS.length} · {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  bars: { flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 4, borderRadius: radii.pill, backgroundColor: colors.border },
  barDone: { backgroundColor: colors.accent },
  text: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.textSecondary },
});
