import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, Screen } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';

import { useDismissDuplicate, useDuplicatePairs } from '../duplicateHooks';
import type { DuplicatePair, DuplicatePerson } from '../duplicates';

function displayName(p: DuplicatePerson) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ');
}

function PersonColumn({
  person,
  networkNames,
}: {
  person: DuplicatePerson;
  networkNames: ReadonlyMap<string, string>;
}) {
  const networks = person.networkIds.map((id) => networkNames.get(id)).filter(Boolean);
  const label = networks.length > 0 ? networks.join(', ') : 'No network';
  return (
    <View style={styles.column} accessible accessibilityLabel={`${displayName(person)}, ${label}`}>
      <Avatar firstName={person.first_name} lastName={person.last_name ?? undefined} />
      <Text style={styles.name} numberOfLines={2}>
        {displayName(person)}
      </Text>
      {person.preferred_name ? <Text style={styles.meta}>“{person.preferred_name}”</Text> : null}
      <Text style={styles.meta} numberOfLines={3}>
        {label}
      </Text>
    </View>
  );
}

function PairCard({
  pair,
  networkNames,
  disabled,
  onDismiss,
  onMerge,
}: {
  pair: DuplicatePair;
  networkNames: ReadonlyMap<string, string>;
  disabled: boolean;
  onDismiss: (pair: DuplicatePair) => void;
  onMerge: (pair: DuplicatePair) => void;
}) {
  const names = `${displayName(pair.a)} and ${displayName(pair.b)}`;
  return (
    <Card>
      {pair.confidence === 'possible' ? (
        <View style={styles.badgeRow}>
          <Badge label="Possible" color={colors.textSecondary} />
        </View>
      ) : null}
      <View style={styles.people}>
        <PersonColumn person={pair.a} networkNames={networkNames} />
        <PersonColumn person={pair.b} networkNames={networkNames} />
      </View>
      <View style={styles.actions}>
        <Button
          label="Not duplicates"
          variant="secondary"
          accessibilityLabel={`Not duplicates: ${names}`}
          disabled={disabled}
          onPress={() => onDismiss(pair)}
          style={styles.action}
        />
        <Button
          label="Merge"
          accessibilityLabel={`Merge ${names}`}
          onPress={() => onMerge(pair)}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

/** Settings > Possible duplicates: pairs side by side, with "Not duplicates" and "Merge". */
export function DuplicatesScreen() {
  const router = useRouter();
  const { pairs, isPending, isError, refetch } = useDuplicatePairs();
  const networks = useNetworks();
  const dismiss = useDismissDuplicate();
  const networkNames = new Map((networks.data ?? []).map((n) => [n.id, n.name]));

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      {isPending ? (
        <Text style={styles.meta}>Looking for duplicates…</Text>
      ) : isError ? (
        <EmptyState
          title="Couldn't check for duplicates"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCtaPress={refetch}
        />
      ) : pairs.length === 0 ? (
        <EmptyState
          title="No possible duplicates"
          subtitle="People with the same name show up here so you can merge them."
        />
      ) : (
        <View style={styles.list}>
          {dismiss.isError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Could not save that. Try again.
            </Text>
          ) : null}
          {pairs.map((pair) => (
            <PairCard
              key={`${pair.a.id}-${pair.b.id}`}
              pair={pair}
              networkNames={networkNames}
              disabled={dismiss.isPending}
              onDismiss={(p) => dismiss.mutate({ aId: p.a.id, bId: p.b.id })}
              onMerge={(p) => router.push({ pathname: '/merge', params: { a: p.a.id, b: p.b.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  badgeRow: { marginBottom: spacing.sm },
  people: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  meta: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
