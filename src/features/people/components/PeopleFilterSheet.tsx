import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { getRelationshipType, type RelationshipTypeId } from '@/features/relationships';

export interface PeopleFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Every tag in the network. */
  tags: readonly string[];
  /** Every relationship type among the listed people. */
  relationshipTypes: readonly RelationshipTypeId[];
  selectedTags: readonly string[];
  selectedTypes: readonly RelationshipTypeId[];
  onToggleTag: (tag: string) => void;
  onToggleType: (type: RelationshipTypeId) => void;
  onClearAll: () => void;
  /** How many people match right now, for the "Show N people" button. */
  resultCount: number;
}

/** Bottom sheet with multi-select tag and relationship-type chips. Changes apply live. */
export function PeopleFilterSheet({
  visible,
  onClose,
  tags,
  relationshipTypes,
  selectedTags,
  selectedTypes,
  onToggleTag,
  onToggleType,
  onClearAll,
  resultCount,
}: PeopleFilterSheetProps) {
  const hasSelection = selectedTags.length + selectedTypes.length > 0;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          onPress={onClose}
          style={styles.scrim}
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Filter people
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={onClose}
              hitSlop={8}
              style={styles.close}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Group title="Groups & tags" emptyText="No tags in this network yet.">
              {tags.map((tag) => (
                <ToggleChip
                  key={tag}
                  label={tag}
                  accessibilityLabel={`Tag ${tag}`}
                  selected={selectedTags.includes(tag)}
                  onPress={() => onToggleTag(tag)}
                />
              ))}
            </Group>
            <Group title="Relationship" emptyText="No relationships in this network yet.">
              {relationshipTypes.map((type) => {
                const label = getRelationshipType(type)?.label ?? type;
                return (
                  <ToggleChip
                    key={type}
                    label={label}
                    accessibilityLabel={`Relationship ${label}`}
                    selected={selectedTypes.includes(type)}
                    onPress={() => onToggleType(type)}
                  />
                );
              })}
            </Group>
            <Text style={styles.hint}>
              People matching any selected tag, and any selected relationship, are shown.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Clear all"
              variant="ghost"
              onPress={onClearAll}
              disabled={!hasSelection}
              style={styles.footerButton}
            />
            <Button
              label={`Show ${resultCount} ${resultCount === 1 ? 'person' : 'people'}`}
              onPress={onClose}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Group({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: ReactNode[];
}) {
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.groupTitle}>
        {title}
      </Text>
      {children.length > 0 ? (
        <View style={styles.chips}>{children}</View>
      ) : (
        <Text style={styles.empty}>{emptyText}</Text>
      )}
    </View>
  );
}

function ToggleChip({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {/* A check mark as well as the fill, so selection never relies on color alone. */}
      {selected ? <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} /> : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  close: {
    width: minTapTarget,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.base, paddingBottom: spacing.base, gap: spacing.lg },
  group: { gap: spacing.sm },
  groupTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { fontSize: fontSizes.sm, color: colors.textSecondary },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary },
  chip: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: fontSizes.sm, color: colors.text },
  chipLabelSelected: { color: colors.textOnPrimary, fontWeight: fontWeights.medium },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: { flex: 1 },
});
