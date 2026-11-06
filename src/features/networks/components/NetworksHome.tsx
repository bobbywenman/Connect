import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Screen } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

import type { NetworkSummary } from '../api';
import { useNetworks } from '../hooks';
import { NetworkCard } from './NetworkCard';

const SKELETON_COUNT = 3;

/** Home hub: the user's networks as color-coded cards. */
export function NetworksHome() {
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useNetworks();
  const [pulling, setPulling] = useState(false);

  const openNetwork = (network: NetworkSummary) =>
    router.push({ pathname: '/network/[id]', params: { id: network.id } });
  const createNetwork = () => router.push('/network/new');

  const onRefresh = async () => {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  };

  let body;
  if (isPending) {
    body = (
      <View testID="networks-loading" accessibilityLabel="Loading networks" style={styles.list}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <Card key={i} style={styles.skeleton}>
            <View style={[styles.skeletonLine, styles.skeletonTitle]} />
            <View style={[styles.skeletonLine, styles.skeletonMeta]} />
          </Card>
        ))}
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Couldn&apos;t load your networks
        </Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Button label="Retry" onPress={() => void refetch()} isLoading={isRefetching} />
      </View>
    );
  } else if (data.length === 0) {
    body = (
      <View style={styles.centered}>
        <EmptyState
          title="Create your first network"
          subtitle="A network is a group of people, like your family or your team."
          icon={<Ionicons name="people-outline" size={48} color={colors.textSecondary} />}
          ctaLabel="Create network"
          onCtaPress={createNetwork}
        />
      </View>
    );
  } else {
    body = (
      <FlatList
        testID="networks-list"
        data={data}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NetworkCard network={item} onPress={openNetwork} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} />}
      />
    );
  }

  return (
    <Screen edges={['top']}>
      <Text accessibilityRole="header" style={styles.heading}>
        Your networks
      </Text>
      <View style={styles.body}>{body}</View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create network"
        onPress={createNetwork}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.base,
  },
  body: { flex: 1 },
  list: { paddingBottom: FAB_SIZE + spacing.xl, gap: 0 },
  separator: { height: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  errorBody: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  skeleton: { gap: spacing.sm, marginBottom: spacing.md, padding: spacing.base },
  skeletonLine: { backgroundColor: colors.border, borderRadius: radii.sm, height: 14 },
  skeletonTitle: { width: '55%', height: 20 },
  skeletonMeta: { width: '35%' },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    width: Math.max(FAB_SIZE, minTapTarget),
    height: Math.max(FAB_SIZE, minTapTarget),
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  },
  fabPressed: { opacity: 0.85 },
});
