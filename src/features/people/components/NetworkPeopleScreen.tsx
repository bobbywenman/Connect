import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, EmptyState } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import {
  getRelationshipType,
  type NameLookup,
  type RelationshipTypeId,
} from '@/features/relationships';

import { useNetworkPeople } from '../hooks';
import {
  collectRelationshipTypes,
  collectTags,
  filterPeople,
  hasActiveFilters,
  primaryLabel,
  sortPeople,
  type NetworkPerson,
} from '../listing';
import { PeopleFilterSheet } from './PeopleFilterSheet';
import { PersonRow } from './PersonRow';
import { SearchBar } from './SearchBar';

export interface NetworkPeopleScreenProps {
  networkId: string;
  /** Stored color name of the network, for the bar at the top. */
  networkColor?: string | null;
}

const SKELETON_ROWS = 8;

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** The people in one network (plus You), searchable and filterable on the device. */
export function NetworkPeopleScreen({ networkId, networkColor }: NetworkPeopleScreenProps) {
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useNetworkPeople(networkId);

  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [types, setTypes] = useState<RelationshipTypeId[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pulling, setPulling] = useState(false);

  // Everything below depends only on the fetched data, so typing never redoes it.
  const prepared = useMemo(() => {
    if (!data) return null;
    const sorted = sortPeople(data.people);
    const byId = new Map(data.people.map((p) => [p.id, p]));
    const names: NameLookup = (id) => {
      const person = byId.get(id);
      return person
        ? { first_name: person.first_name, preferred_name: person.preferred_name }
        : undefined;
    };
    const labels = new Map(
      sorted.map((p) => [p.id, primaryLabel(p, data.relationships, data.selfId, names)]),
    );
    return {
      sorted,
      labels,
      allTags: collectTags(sorted),
      allTypes: collectRelationshipTypes(data.relationships),
      onlySelf: sorted.every((p) => p.is_self),
    };
  }, [data]);

  const filters = useMemo(() => ({ query, tags, relationshipTypes: types }), [query, tags, types]);
  const visible = useMemo(
    () => (prepared && data ? filterPeople(prepared.sorted, filters, data.relationships) : []),
    [prepared, data, filters],
  );

  const openPerson = useCallback(
    (id: string) => router.push({ pathname: '/person/[id]', params: { id } }),
    [router],
  );
  const addPerson = () => router.push({ pathname: '/person/new', params: { networkId } });
  const clearAll = () => {
    setQuery('');
    setTags([]);
    setTypes([]);
  };

  const onRefresh = async () => {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: NetworkPerson }) => (
      <PersonRow person={item} label={prepared?.labels.get(item.id) ?? null} onPress={openPerson} />
    ),
    [prepared, openPerson],
  );

  // Counts leave out You, so they agree with the network card ("8 people").
  const matchCount = visible.filter((p) => !p.is_self).length;
  const filtering = hasActiveFilters(filters);
  const filterGroupCount = (tags.length > 0 ? 1 : 0) + (types.length > 0 ? 1 : 0);

  let body;
  if (isPending) {
    body = <Skeleton />;
  } else if (isError || !prepared) {
    body = (
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Couldn&apos;t load this network
        </Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Button label="Retry" onPress={() => void refetch()} isLoading={isRefetching} />
      </View>
    );
  } else if (prepared.onlySelf) {
    body = (
      <View style={styles.centered}>
        <EmptyState
          title="Add your first person"
          subtitle="Start with someone you want to remember in this network."
          icon={<Ionicons name="person-add-outline" size={48} color={colors.textSecondary} />}
          ctaLabel="Add person"
          onCtaPress={addPerson}
        />
      </View>
    );
  } else {
    body = (
      <>
        <View style={styles.controls}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            activeFilterCount={filterGroupCount}
            onOpenFilters={() => setFiltersOpen(true)}
          />
          {filtering ? (
            <View style={styles.summary}>
              <View style={styles.summaryChips}>
                <Text accessibilityLiveRegion="polite" style={styles.summaryText}>
                  {matchCount} of {prepared.sorted.length - 1}
                </Text>
                {tags.map((tag) => (
                  <Chip
                    key={`tag-${tag}`}
                    label={`Tag: ${tag}`}
                    onRemove={() => setTags((t) => toggle(t, tag))}
                  />
                ))}
                {types.map((type) => (
                  <Chip
                    key={`type-${type}`}
                    label={getRelationshipType(type)?.label ?? type}
                    onRemove={() => setTypes((t) => toggle(t, type))}
                  />
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear"
                onPress={clearAll}
                style={styles.clear}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <FlashList
          testID="people-list"
          data={visible}
          renderItem={renderItem}
          keyExtractor={(p) => p.id}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            <View style={styles.noMatches}>
              <EmptyState
                title="No matches"
                subtitle="Try a different name, or clear the search and filters."
                ctaLabel="Clear"
                onCtaPress={clearAll}
              />
            </View>
          }
        />
        <PeopleFilterSheet
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          tags={prepared.allTags}
          relationshipTypes={prepared.allTypes}
          selectedTags={tags}
          selectedTypes={types}
          onToggleTag={(tag) => setTags((t) => toggle(t, tag))}
          onToggleType={(type) => setTypes((t) => toggle(t, type))}
          onClearAll={() => {
            setTags([]);
            setTypes([]);
          }}
          resultCount={matchCount}
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <View
        testID="network-color-bar"
        importantForAccessibility="no"
        style={[styles.colorBar, { backgroundColor: resolveNetworkColor(networkColor) }]}
      />
      <View style={styles.body}>{body}</View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add person"
        onPress={addPerson}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

/** Header button: jump straight into studying this network. */
export function StudyHeaderButton({ networkId }: { networkId: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Study this network"
      onPress={() => router.push({ pathname: '/study/session', params: { networkId } })}
      style={styles.study}
    >
      <Ionicons name="school-outline" size={20} color={colors.primary} />
      <Text style={styles.studyText}>Study</Text>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function Skeleton() {
  return (
    <View testID="people-loading" accessibilityLabel="Loading people" style={styles.skeletonList}>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonText}>
            <View style={[styles.skeletonLine, { width: `${50 + ((i * 13) % 30)}%` }]} />
            <View style={[styles.skeletonLine, styles.skeletonSub]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  colorBar: { height: 4 },
  body: { flex: 1 },
  controls: { gap: spacing.sm, padding: spacing.base, paddingBottom: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  summaryChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  clear: { minHeight: minTapTarget, minWidth: minTapTarget, justifyContent: 'center' },
  clearText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.accent },
  list: { paddingBottom: FAB_SIZE + spacing.xl },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 48 + spacing.md,
  },
  noMatches: { paddingTop: spacing.xl },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  errorBody: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  skeletonList: { paddingTop: spacing.base },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 72,
  },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface },
  skeletonText: { flex: 1, gap: spacing.sm },
  skeletonLine: { height: 14, borderRadius: radii.sm, backgroundColor: colors.surface },
  skeletonSub: { width: '30%', height: 12 },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  },
  fabPressed: { opacity: 0.85 },
  study: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  studyText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.primary },
});
