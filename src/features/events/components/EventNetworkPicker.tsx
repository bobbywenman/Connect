import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import type { NetworkSummary } from '@/features/networks/api';
import { resolveNetworkColor } from '@/features/networks/colors';

export interface EventNetworkPickerProps {
  networks: NetworkSummary[];
  /** Selected network id, or '' for none. */
  value: string;
  onChange: (id: string) => void;
}

/** Optional single choice of network as radio chips; "None" clears it. Selection shows a tick, not just color. */
export function EventNetworkPicker({ networks, value, onChange }: EventNetworkPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Network (optional)</Text>
      <View accessibilityRole="radiogroup" style={styles.chips}>
        <Chip label="None" selected={value === ''} onPress={() => onChange('')} />
        {networks.map((network) => (
          <Chip
            key={network.id}
            label={network.name}
            color={resolveNetworkColor(network.color)}
            selected={value === network.id}
            onPress={() => onChange(network.id)}
          />
        ))}
      </View>
    </View>
  );
}

function Chip({
  label,
  color = colors.primary,
  selected,
  onPress,
}: {
  label: string;
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[styles.chip, selected ? { backgroundColor: color, borderColor: color } : null]}
    >
      {selected ? null : <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: fontSizes.sm, color: colors.text },
  chipTextOn: { color: colors.textOnPrimary, fontWeight: fontWeights.medium },
});
