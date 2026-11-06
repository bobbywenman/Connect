import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

import type { NetworkSummary } from '../api';
import { formatPersonCount, networkTypeLabel, resolveNetworkColor } from '../colors';

export interface NetworkCardProps {
  network: NetworkSummary;
  onPress: (network: NetworkSummary) => void;
}

export function NetworkCard({ network, onPress }: NetworkCardProps) {
  const typeLabel = networkTypeLabel(network.type);
  const count = formatPersonCount(network.personCount);
  return (
    <Card
      onPress={() => onPress(network)}
      accessibilityLabel={`${network.name}, ${typeLabel} network, ${count}`}
      style={styles.card}
    >
      <View style={styles.row}>
        <View
          testID="network-color-bar"
          style={[styles.bar, { backgroundColor: resolveNetworkColor(network.color) }]}
        />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {network.name}
          </Text>
          <Text style={styles.meta}>
            {typeLabel} · {count}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // The card has its own padding; drop it so the color bar spans the full height.
  card: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  bar: { width: 4 },
  body: { flex: 1, gap: spacing.xs, padding: spacing.base },
  name: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  meta: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
