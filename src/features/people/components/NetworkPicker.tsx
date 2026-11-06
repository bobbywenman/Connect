import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import type { NetworkSummary } from '@/features/networks/api';
import { resolveNetworkColor } from '@/features/networks/colors';

export interface NetworkPickerProps {
  networks: NetworkSummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

/** Multi-select of networks as toggle chips (checked state is shown with a tick, not just color). */
export function NetworkPicker({ networks, selectedIds, onChange, error }: NetworkPickerProps) {
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Networks *</Text>
      {networks.length === 0 ? (
        <Text style={styles.hint}>You have no networks yet. Create one first.</Text>
      ) : (
        <View accessibilityRole="none" style={styles.chips}>
          {networks.map((network) => {
            const checked = selectedIds.includes(network.id);
            const color = resolveNetworkColor(network.color);
            return (
              <Pressable
                key={network.id}
                accessibilityRole="checkbox"
                accessibilityLabel={network.name}
                accessibilityState={{ checked }}
                aria-checked={checked}
                onPress={() => toggle(network.id)}
                style={[
                  styles.chip,
                  checked ? { backgroundColor: color, borderColor: color } : null,
                ]}
              >
                {checked ? null : <View style={[styles.dot, { backgroundColor: color }]} />}
                <Text style={[styles.chipText, checked && styles.chipTextOn]}>
                  {checked ? '✓ ' : ''}
                  {network.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  hint: { fontSize: fontSizes.sm, color: colors.textSecondary },
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
  error: { fontSize: fontSizes.sm, color: colors.error },
});
