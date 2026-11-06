import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, EmptyState } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import type { NetworkSummary } from '@/features/networks/api';

import {
  clearSelection,
  filterRows,
  selectAll,
  setKey,
  toggleKey,
  type ReviewRow,
} from '../review';
import { ContactRow } from './ContactRow';

export interface ImportPickerProps {
  rows: ReviewRow[];
  selected: ReadonlySet<string>;
  onSelectedChange: (selected: Set<string>) => void;
  networks: NetworkSummary[];
  targetNetworkId: string | undefined;
  onTargetChange: (id: string) => void;
  onCreateNetwork: () => void;
  includePhotos: boolean;
  onIncludePhotosChange: (value: boolean) => void;
  importCount: number;
  onImport: () => void;
  /** iOS limited access: show a hint that more contacts can be shared in Settings. */
  limitedAccess?: boolean;
  onOpenSettings?: () => void;
}

function Separator() {
  return <View style={styles.separator} />;
}

/** The review step: search, pick contacts, choose the network, start the import. */
export function ImportPicker({
  rows,
  selected,
  onSelectedChange,
  networks,
  targetNetworkId,
  onTargetChange,
  onCreateNetwork,
  includePhotos,
  onIncludePhotosChange,
  importCount,
  onImport,
  limitedAccess,
  onOpenSettings,
}: ImportPickerProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterRows(rows, query), [rows, query]);
  const selectable = rows.filter((r) => r.status !== 'already').length;

  const onToggle = useCallback(
    (key: string) => onSelectedChange(toggleKey(selected, key)),
    [selected, onSelectedChange],
  );
  const onChoose = useCallback(
    (key: string, on: boolean) => onSelectedChange(setKey(selected, key, on)),
    [selected, onSelectedChange],
  );
  const renderItem = useCallback(
    ({ item }: { item: ReviewRow }) => (
      <ContactRow
        row={item}
        selected={selected.has(item.candidate.key)}
        onToggle={onToggle}
        onChoose={onChoose}
      />
    ),
    [selected, onToggle, onChoose],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        {limitedAccess ? (
          <View style={styles.limited}>
            <Text style={styles.limitedText}>
              KnowThem can only see the contacts you chose to share.
            </Text>
            {onOpenSettings ? (
              <Button label="Share more" variant="ghost" size="sm" onPress={onOpenSettings} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.search}>
          <Ionicons
            name="search"
            size={20}
            color={colors.textSecondary}
            importantForAccessibility="no"
          />
          <TextInput
            testID="contact-search"
            accessibilityLabel="Search contacts"
            placeholder="Search contacts"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
        </View>

        <View style={styles.bulk}>
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {selectable} to choose from
          </Text>
          <Button
            label="Select all"
            variant="ghost"
            size="sm"
            onPress={() => onSelectedChange(selectAll(selected, visible))}
          />
          <Button
            label="Clear"
            variant="ghost"
            size="sm"
            onPress={() => onSelectedChange(clearSelection())}
          />
        </View>

        <View accessibilityRole="radiogroup" style={styles.networks}>
          <Text style={styles.label}>Add to</Text>
          <View style={styles.chips}>
            {networks.map((network) => {
              const checked = network.id === targetNetworkId;
              const color = resolveNetworkColor(network.color);
              return (
                <Pressable
                  key={network.id}
                  accessibilityRole="radio"
                  accessibilityLabel={network.name}
                  accessibilityState={{ checked }}
                  onPress={() => onTargetChange(network.id)}
                  style={[styles.chip, checked && { backgroundColor: color, borderColor: color }]}
                >
                  <Text style={[styles.chipText, checked && styles.chipTextOn]}>
                    {checked ? '✓ ' : ''}
                    {network.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New network"
              onPress={onCreateNetwork}
              style={styles.chip}
            >
              <Text style={styles.chipText}>+ New network</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Include photos"
          accessibilityHint="Copies contact photos too. This makes the import slower."
          accessibilityState={{ checked: includePhotos }}
          aria-checked={includePhotos}
          onPress={() => onIncludePhotosChange(!includePhotos)}
          style={styles.photos}
        >
          <View style={[styles.tick, includePhotos && styles.tickOn]}>
            {includePhotos ? (
              <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
            ) : null}
          </View>
          <View style={styles.photosText}>
            <Text style={styles.photosTitle}>Include photos</Text>
            <Text style={styles.hint}>Slower for big imports, so it is off by default.</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.list}>
        <FlashList
          testID="contact-list"
          data={visible}
          renderItem={renderItem}
          keyExtractor={(r) => r.candidate.key}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <EmptyState
              title={rows.length === 0 ? 'No contacts to import' : 'No matches'}
              subtitle={
                rows.length === 0
                  ? 'We could not find contacts with a first name.'
                  : 'Try a different name or company.'
              }
            />
          }
        />
      </View>

      <View style={styles.footer}>
        <Button
          label={`Import ${importCount}`}
          disabled={importCount === 0 || !targetNetworkId}
          onPress={onImport}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { gap: spacing.sm, padding: spacing.base, paddingBottom: spacing.sm },
  limited: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  limitedText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
  search: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, minHeight: minTapTarget, fontSize: fontSizes.base, color: colors.text },
  bulk: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  count: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
  networks: { gap: spacing.xs },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipText: { fontSize: fontSizes.sm, color: colors.text },
  chipTextOn: { color: colors.textOnPrimary, fontWeight: fontWeights.medium },
  photos: { minHeight: minTapTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photosText: { flex: 1 },
  photosTitle: { fontSize: fontSizes.base, color: colors.text },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary },
  tick: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  list: { flex: 1 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.base,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
