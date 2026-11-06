import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import { fullName } from '@/features/people/listing';

import { matchHint, type SearchNetwork, type SearchResult } from '../api';

export const MAX_NETWORK_CHIPS = 3;

export interface SearchResultRowProps {
  result: SearchResult;
  /** Signed URL for the person's photo, when it has loaded. */
  photoUrl?: string | null;
  onPress: (personId: string) => void;
}

/** Spoken form of a row: "Robert Wenman, in Family and Work. Tag: climbing". */
export function resultAccessibilityLabel(result: SearchResult): string {
  const parts = [
    result.isSelf ? `${fullName(toNameParts(result))}, you` : fullName(toNameParts(result)),
  ];
  if (result.networks.length > 0) {
    parts[0] += `, in ${result.networks.map((n) => n.name).join(' and ')}`;
  }
  const hint = matchHint(result);
  if (hint) parts.push(hint);
  return parts.join('. ');
}

function toNameParts(result: SearchResult) {
  return {
    first_name: result.firstName,
    last_name: result.lastName,
    preferred_name: result.preferredName,
  };
}

/** One search hit: avatar, name, the networks the person is in, and why it matched. */
export const SearchResultRow = memo(function SearchResultRow({
  result,
  photoUrl,
  onPress,
}: SearchResultRowProps) {
  const hint = matchHint(result);
  const shown = result.networks.slice(0, MAX_NETWORK_CHIPS);
  const more = result.networks.length - shown.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resultAccessibilityLabel(result)}
      accessibilityHint="Opens the profile"
      onPress={() => onPress(result.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar
          firstName={result.firstName}
          lastName={result.lastName ?? undefined}
          photoUrl={photoUrl}
          photoCacheKey={result.photoPath ? `${result.photoPath}?v=${result.updatedAt}` : undefined}
        />
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {fullName(toNameParts(result))}
          {result.isSelf ? <Text style={styles.you}>{'  You'}</Text> : null}
        </Text>
        {shown.length > 0 ? (
          <View style={styles.networks}>
            {shown.map((network) => (
              <NetworkTag key={network.id} network={network} />
            ))}
            {more > 0 ? <Text style={styles.more}>+{more}</Text> : null}
          </View>
        ) : null}
        {hint ? (
          <Text numberOfLines={2} style={styles.hint}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textSecondary}
        importantForAccessibility="no"
      />
    </Pressable>
  );
});

/** A network as a colored dot plus its name. The name carries the meaning; color is a hint. */
function NetworkTag({ network }: { network: SearchNetwork }) {
  return (
    <View style={styles.tag}>
      <View style={[styles.dot, { backgroundColor: resolveNetworkColor(network.color) }]} />
      <Text numberOfLines={1} style={styles.tagText}>
        {network.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1, gap: spacing.xs },
  name: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  you: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.primary },
  networks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  tag: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { flexShrink: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
  more: { fontSize: fontSizes.sm, color: colors.textSecondary },
  hint: { fontSize: fontSizes.sm, color: colors.text },
});
