import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, ConfirmDialog, EmptyState, Screen } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import { useNetworks } from '@/features/networks/hooks';
import { fullName, sortPeople } from '@/features/people/listing';
import { usePhotoUrls } from '@/features/people/photoHooks';

import type { PickerPerson } from '../api';
import {
  filterPickerPeople,
  isAllInViewSelected,
  sameSelection,
  selectAllInView,
  selectedLabel,
  toggleSelected,
} from '../attendeePicker';
import { useEvent, usePickerPeople, useSetEventAttendees } from '../hooks';

export interface AttendeePickerScreenProps {
  eventId: string;
  /** Called after a successful save, or when the user leaves without changes (or discards them). */
  onClose: () => void;
}

const SAVE_ERROR = "Couldn't save. Check your connection and try again.";

interface NetworkDot {
  id: string;
  name: string;
  color: string;
}

function Message({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <Screen>
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.messageTitle}>
          {title}
        </Text>
        {body ? <Text style={styles.messageBody}>{body}</Text> : null}
        {onRetry ? <Button label="Retry" onPress={onRetry} /> : null}
      </View>
    </Screen>
  );
}

/** Choose who is going to an event from everyone you know, across all networks. */
export function AttendeePickerScreen({ eventId, onClose }: AttendeePickerScreenProps) {
  const event = useEvent(eventId);
  const people = usePickerPeople();
  const networks = useNetworks();
  const save = useSetEventAttendees(eventId);

  // null until the user touches something, so the saved attendees show until then.
  const [edited, setEdited] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState('');
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const sorted = useMemo(() => sortPeople(people.data ?? []), [people.data]);
  const original = useMemo(
    () => new Set((event.data?.attendees ?? []).map((a) => a.id)),
    [event.data],
  );
  const selected = edited ?? original;
  const dirty = !sameSelection(selected, original);

  const dotsByNetwork = useMemo(() => {
    const map = new Map<string, NetworkDot>();
    (networks.data ?? []).forEach((n) =>
      map.set(n.id, { id: n.id, name: n.name, color: resolveNetworkColor(n.color) }),
    );
    return map;
  }, [networks.data]);

  const visible = useMemo(
    () => filterPickerPeople(sorted, { query, networkId }),
    [sorted, query, networkId],
  );

  // One request signs every photo; the version changes when any photo is replaced.
  const photoPaths = useMemo(() => sorted.map((p) => p.photo_path), [sorted]);
  const photoVersion = useMemo(
    () =>
      sorted
        .filter((p) => p.photo_path)
        .map((p) => p.updated_at)
        .sort()
        .at(-1),
    [sorted],
  );
  const photoUrls = usePhotoUrls(photoPaths, photoVersion).data;

  const toggle = useCallback(
    (id: string) => setEdited((current) => toggleSelected(current ?? original, id)),
    [original],
  );

  const renderItem = useCallback(
    ({ item }: { item: PickerPerson }) => (
      <PickerRow
        person={item}
        checked={selected.has(item.id)}
        photoUrl={item.photo_path ? (photoUrls?.[item.photo_path] ?? null) : null}
        dots={item.networkIds.flatMap((id) => dotsByNetwork.get(id) ?? [])}
        onToggle={toggle}
      />
    ),
    [selected, photoUrls, dotsByNetwork, toggle],
  );

  if (event.isPending || people.isPending) return <Message title="Loading…" />;
  if (event.isError || people.isError) {
    return (
      <Message
        title="Couldn't load people"
        body="Check your connection and try again."
        onRetry={() => {
          void event.refetch();
          void people.refetch();
        }}
      />
    );
  }
  if (!event.data) return <Message title="Event not found" />;

  const allInView = isAllInViewSelected(selected, visible);
  const filtering = query.trim() !== '' || networkId !== null;

  const cancel = () => {
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  };
  const submit = async () => {
    try {
      await save.mutateAsync([...selected]);
      onClose();
    } catch {
      // Surfaced through save.isError below; the selection stays as it was.
    }
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.headerBar}>
        <Button label="Cancel" variant="ghost" onPress={cancel} disabled={save.isPending} />
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={styles.headerTitle}
          numberOfLines={1}
        >
          {selectedLabel(selected.size)}
        </Text>
        <Button label="Save" isLoading={save.isPending} onPress={() => void submit()} />
      </View>

      <View style={styles.search}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textSecondary}
          importantForAccessibility="no"
        />
        <TextInput
          testID="attendee-search"
          accessibilityLabel="Search people"
          placeholder="Search people"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            style={styles.clearSearch}
          >
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        <NetworkChip label="All" selected={networkId === null} onPress={() => setNetworkId(null)} />
        {(networks.data ?? []).map((n) => (
          <NetworkChip
            key={n.id}
            label={n.name}
            color={resolveNetworkColor(n.color)}
            selected={networkId === n.id}
            onPress={() => setNetworkId(n.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.bulk}>
        <Text accessibilityLiveRegion="polite" style={styles.bulkCount}>
          {filtering ? `${visible.length} shown` : `${visible.length} people`}
        </Text>
        <View style={styles.bulkActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select all in view"
            accessibilityState={{ disabled: visible.length === 0 || allInView }}
            disabled={visible.length === 0 || allInView}
            onPress={() => setEdited(selectAllInView(selected, visible))}
            style={styles.bulkButton}
          >
            <Text style={[styles.bulkText, allInView && styles.bulkTextOff]}>
              Select all in view
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear selection"
            accessibilityState={{ disabled: selected.size === 0 }}
            disabled={selected.size === 0}
            onPress={() => setEdited(new Set())}
            style={styles.bulkButton}
          >
            <Text style={[styles.bulkText, selected.size === 0 && styles.bulkTextOff]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {save.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {SAVE_ERROR}
        </Text>
      ) : null}

      <FlashList
        testID="attendee-list"
        data={visible}
        extraData={selected}
        renderItem={renderItem}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={styles.noMatches}>
            <EmptyState
              title="No matches"
              subtitle="Try a different name, or pick another network."
              ctaLabel="Clear filters"
              onCtaPress={() => {
                setQuery('');
                setNetworkId(null);
              }}
            />
          </View>
        }
      />

      <ConfirmDialog
        visible={confirmingDiscard}
        title="Discard changes?"
        message="Your changes to who is going will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirmingDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </Screen>
  );
}

function NetworkChip({
  label,
  color,
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
      accessibilityRole="button"
      accessibilityLabel={`${label} network filter`}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {selected ? (
        <Ionicons
          name="checkmark"
          size={16}
          color={colors.textOnPrimary}
          importantForAccessibility="no"
        />
      ) : null}
    </Pressable>
  );
}

interface PickerRowProps {
  person: PickerPerson;
  checked: boolean;
  photoUrl: string | null;
  dots: NetworkDot[];
  onToggle: (personId: string) => void;
}

/** One selectable person. Memoised: the list re-renders on every keystroke of search. */
const PickerRow = memo(function PickerRow({
  person,
  checked,
  photoUrl,
  dots,
  onToggle,
}: PickerRowProps) {
  const name = fullName(person);
  const networkNames = dots.map((d) => d.name).join(', ');
  const label = [person.is_self ? `${name}, you` : name, networkNames && `in ${networkNames}`]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={() => onToggle(person.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar
          firstName={person.first_name}
          lastName={person.last_name ?? undefined}
          photoUrl={photoUrl}
          photoCacheKey={
            person.photo_path ? `${person.photo_path}?v=${person.updated_at}` : undefined
          }
        />
      </View>
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {person.is_self || dots.length > 0 ? (
          <View style={styles.rowMeta}>
            {person.is_self ? <Text style={styles.you}>You</Text> : null}
            {dots.map((d) => (
              <NetworkTag key={d.id} name={d.name} color={d.color} />
            ))}
          </View>
        ) : null}
      </View>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.box, checked && styles.boxChecked]}
      >
        {checked ? <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} /> : null}
      </View>
    </Pressable>
  );
});

function NetworkTag({ name, color }: { name: string; color: string }) {
  return (
    <View style={styles.tag}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={styles.tagText}>
        {name}
      </Text>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const BOX = 28;

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  messageTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  messageBody: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  search: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, minHeight: minTapTarget, fontSize: fontSizes.base, color: colors.text },
  clearSearch: {
    width: minTapTarget,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: { flexGrow: 0, marginTop: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.base },
  chip: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  chipTextSelected: { color: colors.textOnPrimary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bulk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bulkCount: { fontSize: fontSizes.sm, color: colors.textSecondary },
  bulkActions: { flexDirection: 'row', alignItems: 'center' },
  bulkButton: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  bulkText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.accent },
  bulkTextOff: { color: colors.textSecondary, fontWeight: fontWeights.regular },
  error: { fontSize: fontSizes.sm, color: colors.error, paddingBottom: spacing.sm },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, gap: spacing.xs },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md },
  tag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tagText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  name: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  you: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.primary },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 48 + spacing.md,
  },
  noMatches: { paddingTop: spacing.xl },
});
