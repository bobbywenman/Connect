import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, EmptyState } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { usePhotoUrls } from '@/features/people/photoHooks';
import { useSession } from '@/store/session';

import { MIN_QUERY_LENGTH, normalizeQuery, type SearchResult } from '../api';
import { useSearchPeople } from '../hooks';
import { useRecentSearches } from '../recent';
import { SearchResultRow } from './SearchResultRow';

const SKELETON_ROWS = 6;

/** The Search tab: one field that finds people by name, tag, job title or notes. */
export function SearchScreen() {
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const search = useSearchPeople(query);
  const recent = useRecentSearches((s) => s.items);
  const loadRecent = useRecentSearches((s) => s.load);
  const addRecent = useRecentSearches((s) => s.add);
  const clearRecent = useRecentSearches((s) => s.clear);

  useEffect(() => {
    if (userId) void loadRecent(userId);
  }, [userId, loadRecent]);

  const typed = normalizeQuery(query);
  const results = search.data;
  const photos = usePhotoUrls((results ?? []).map((r) => r.photoPath));

  const openPerson = useCallback(
    (id: string) => {
      addRecent(typed);
      router.push({ pathname: '/person/[id]', params: { id } });
    },
    [addRecent, typed, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <SearchResultRow
        result={item}
        photoUrl={item.photoPath ? (photos.data?.[item.photoPath] ?? null) : null}
        onPress={openPerson}
      />
    ),
    [photos.data, openPerson],
  );

  // Previous results stay visible (dimmed) while newer ones load.
  const stale = search.isPlaceholderData || search.isSettling;
  const hasResults = !!results && results.length > 0;
  const listStyle = useMemo(() => (stale ? styles.stale : undefined), [stale]);

  let body;
  if (typed.length === 0) {
    body =
      recent.length > 0 ? (
        <RecentSearches items={recent} onPick={setQuery} onClear={clearRecent} />
      ) : (
        <View style={styles.centered}>
          <EmptyState
            title="Find anyone fast"
            subtitle="Search by name, tag, job title or something you wrote in their notes."
            icon={<Ionicons name="search" size={48} color={colors.textSecondary} />}
          />
        </View>
      );
  } else if (typed.length < MIN_QUERY_LENGTH) {
    body = (
      <View style={styles.centered}>
        <Text accessibilityLiveRegion="polite" style={styles.hintText}>
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </Text>
      </View>
    );
  } else if (search.isError && !hasResults) {
    body = (
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Couldn&apos;t search
        </Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Button label="Retry" onPress={() => void search.refetch()} isLoading={search.isFetching} />
      </View>
    );
  } else if (!results || (stale && !hasResults)) {
    body = <Skeleton />;
  } else if (!hasResults) {
    body = (
      <View style={styles.centered}>
        <EmptyState
          title="No results"
          subtitle={`Nobody matches “${typed}”. Try part of a name, a tag or a word from their notes.`}
          icon={<Ionicons name="search" size={48} color={colors.textSecondary} />}
        />
      </View>
    );
  } else {
    body = (
      <FlashList
        testID="search-results"
        data={results}
        renderItem={renderItem}
        keyExtractor={(r) => r.id}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={listStyle}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {results.length === 1 ? '1 result' : `${results.length} results`}
          </Text>
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <Ionicons
            name="search"
            size={20}
            color={colors.textSecondary}
            importantForAccessibility="no"
          />
          <TextInput
            testID="global-search"
            accessibilityLabel="Search everyone"
            placeholder="Name, tag, job or notes"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => addRecent(typed)}
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              style={styles.clear}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>{body}</View>
    </View>
  );
}

interface RecentSearchesProps {
  items: readonly string[];
  onPick: (query: string) => void;
  onClear: () => void;
}

function RecentSearches({ items, onPick, onClear }: RecentSearchesProps) {
  return (
    <View testID="recent-searches" style={styles.recent}>
      <View style={styles.recentHeader}>
        <Text accessibilityRole="header" style={styles.recentTitle}>
          Recent searches
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear recent searches"
          onPress={onClear}
          style={styles.clearAll}
        >
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <RecentItem key={item} query={item} onPick={onPick} />
      ))}
    </View>
  );
}

function RecentItem({ query, onPick }: { query: string; onPick: (query: string) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Search for ${query}`}
      onPress={() => onPick(query)}
      style={({ pressed }) => [styles.recentRow, pressed && styles.recentPressed]}
    >
      <Ionicons
        name="time-outline"
        size={20}
        color={colors.textSecondary}
        importantForAccessibility="no"
      />
      <Text numberOfLines={1} style={styles.recentText}>
        {query}
      </Text>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function SkeletonRow({ widthPercent }: { widthPercent: number }) {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonText}>
        <View style={[styles.skeletonLine, { width: `${widthPercent}%` }]} />
        <View style={[styles.skeletonLine, styles.skeletonSub]} />
      </View>
    </View>
  );
}

function Skeleton() {
  return (
    <View testID="search-loading" accessibilityLabel="Searching" style={styles.skeletonList}>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <SkeletonRow key={i} widthPercent={50 + ((i * 13) % 30)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { padding: spacing.base, paddingBottom: spacing.sm },
  field: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  fieldFocused: { borderColor: colors.accent },
  input: {
    flex: 1,
    minHeight: minTapTarget,
    fontSize: fontSizes.base,
    color: colors.text,
    // The container draws the focus ring; drop the browser's own outline on web.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  clear: {
    width: minTapTarget,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  list: { paddingBottom: spacing.xl },
  stale: { opacity: 0.5 },
  count: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 48 + spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  hintText: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  errorBody: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  recent: { paddingTop: spacing.sm },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.base,
  },
  recentTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  clearAll: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  clearAllText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.accent },
  recentRow: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
  },
  recentPressed: { backgroundColor: colors.surface },
  recentText: { flex: 1, fontSize: fontSizes.base, color: colors.text },
  skeletonList: { paddingTop: spacing.sm },
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
});
