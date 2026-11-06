import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Screen } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';

import type { EventSummary } from '../api';
import { todayIso } from '../dates';
import { groupEvents } from '../grouping';
import { useEvents } from '../hooks';
import { EventCard } from './EventCard';

const SKELETON_COUNT = 3;

interface Section {
  title: string;
  data: EventSummary[];
  emptyText?: string;
}

/** Events tab: upcoming and past gatherings as cards, with a button to plan a new one. */
export function EventsHome() {
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useEvents();
  const { data: networks } = useNetworks();
  const [pulling, setPulling] = useState(false);

  const today = todayIso();
  const networkById = useMemo(() => new Map((networks ?? []).map((n) => [n.id, n])), [networks]);
  const sections = useMemo<Section[]>(() => {
    if (!data) return [];
    const { upcoming, past } = groupEvents(data, today);
    const result: Section[] = [];
    // Keep "Upcoming" visible even when empty, so past-only users are nudged to plan ahead.
    result.push({
      title: 'Upcoming',
      data: upcoming,
      emptyText: 'Nothing coming up. Plan your next gathering with +.',
    });
    if (past.length > 0) result.push({ title: 'Past', data: past });
    return result;
  }, [data, today]);

  const openEvent = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });
  const createEvent = () => router.push('/event/new');

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
      <View testID="events-loading" accessibilityLabel="Loading events" style={styles.list}>
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
          Couldn&apos;t load your events
        </Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Button label="Retry" onPress={() => void refetch()} isLoading={isRefetching} />
      </View>
    );
  } else if (data.length === 0) {
    body = (
      <View style={styles.centered}>
        <EmptyState
          title="Plan for your next gathering"
          subtitle="Add a wedding, reunion or conference, then study who will be there."
          icon={<Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />}
          ctaLabel="Create event"
          onCtaPress={createEvent}
        />
      </View>
    );
  } else {
    body = (
      <SectionList
        testID="events-list"
        sections={sections}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            network={item.networkId ? networkById.get(item.networkId) : undefined}
            today={today}
            onPress={openEvent}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 && section.emptyText ? (
            <Text style={styles.sectionEmpty}>{section.emptyText}</Text>
          ) : null
        }
        ItemSeparatorComponent={Separator}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} />}
      />
    );
  }

  return (
    <Screen edges={[]}>
      <View style={styles.body}>{body}</View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create event"
        onPress={createEvent}
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
  body: { flex: 1 },
  list: { paddingBottom: FAB_SIZE + spacing.xl },
  separator: { height: spacing.md },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionEmpty: { fontSize: fontSizes.base, color: colors.textSecondary },
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
