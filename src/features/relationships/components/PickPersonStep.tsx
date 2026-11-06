import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import { photoCacheKey } from '@/features/people/detail';
import { fullName } from '@/features/people/listing';

import type { PickablePerson } from '../api';
import { displayName } from '../labels';
import { pickerSections } from '../pickerOrder';

export interface PickerNetwork {
  id: string;
  name: string;
  color: string | null;
}

export interface PickPersonStepProps {
  people: readonly PickablePerson[];
  from: PickablePerson | { id: string; first_name: string; preferred_name: string | null };
  /** Ids of the from person's networks; null when the from person is You (in every network). */
  fromNetworkIds: ReadonlySet<string> | null;
  networks: readonly PickerNetwork[];
  photoUrls: Record<string, string> | undefined;
  onPick: (person: PickablePerson) => void;
}

interface Section {
  key: string;
  title: string;
  data: PickablePerson[];
}

/** Step 1: search everyone, You pinned first, then people in shared networks, then the rest. */
export function PickPersonStep({
  people,
  from,
  fromNetworkIds,
  networks,
  photoUrls,
  onPick,
}: PickPersonStepProps) {
  const [query, setQuery] = useState('');
  const networksById = useMemo(() => new Map(networks.map((n) => [n.id, n])), [networks]);
  const sections = useMemo(() => {
    const grouped = pickerSections(people, from.id, fromNetworkIds, query);
    const result: Section[] = [];
    if (grouped.self) result.push({ key: 'self', title: 'You', data: [grouped.self] });
    if (grouped.sameNetwork.length > 0) {
      result.push({
        key: 'same',
        title: fromNetworkIds === null ? 'People' : `In ${displayName(from)}'s networks`,
        data: grouped.sameNetwork,
      });
    }
    if (grouped.others.length > 0) {
      result.push({ key: 'others', title: 'Everyone else', data: grouped.others });
    }
    return result;
  }, [people, from, fromNetworkIds, query]);

  return (
    <View style={styles.flex}>
      <Text accessibilityRole="header" style={styles.heading}>
        Who is {displayName(from)} connected to?
      </Text>
      <View style={styles.search}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textSecondary}
          importantForAccessibility="no"
        />
        <TextInput
          testID="relationship-person-search"
          accessibilityLabel="Search people"
          placeholder="Search people"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
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
      <SectionList
        style={styles.flex}
        sections={sections}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>No one matches &quot;{query}&quot;.</Text>}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <PickerRow
            person={item}
            networks={item.networkIds.flatMap((id) => networksById.get(id) ?? [])}
            photoUrl={item.photo_path ? (photoUrls?.[item.photo_path] ?? null) : null}
            onPick={onPick}
          />
        )}
      />
    </View>
  );
}

const PickerRow = memo(function PickerRow({
  person,
  networks,
  photoUrl,
  onPick,
}: {
  person: PickablePerson;
  networks: PickerNetwork[];
  photoUrl: string | null;
  onPick: (person: PickablePerson) => void;
}) {
  const name = fullName(person);
  const subtitle = person.is_self ? 'You' : networks.map((n) => n.name).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, subtitle].filter(Boolean).join(', ')}
      onPress={() => onPick(person)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar
          firstName={person.first_name}
          lastName={person.last_name ?? undefined}
          photoUrl={photoUrl}
          photoCacheKey={photoCacheKey(person)}
        />
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            {networks.map((n) => (
              <NetworkDot key={n.id} color={n.color} />
            ))}
            <Text numberOfLines={1} style={[styles.subtitle, person.is_self && styles.selfText]}>
              {subtitle}
            </Text>
          </View>
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

function NetworkDot({ color }: { color: string | null }) {
  return <View style={[styles.dot, { backgroundColor: resolveNetworkColor(color) }]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTapTarget,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  input: { flex: 1, fontSize: fontSizes.base, color: colors.text, minHeight: minTapTarget },
  clear: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xs,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subtitle: { flexShrink: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
  selfText: { color: colors.primary, fontWeight: fontWeights.bold },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: {
    padding: spacing.lg,
    textAlign: 'center',
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
});
