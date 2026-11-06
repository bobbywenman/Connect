import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

import type { ReviewRow } from '../review';

export interface ContactRowProps {
  row: ReviewRow;
  /** Will be imported (for a duplicate row this means "Import anyway"). */
  selected: boolean;
  onToggle: (key: string) => void;
  onChoose: (key: string, importAnyway: boolean) => void;
}

function Identity({ row, dimmed }: { row: ReviewRow; dimmed?: boolean }) {
  const { fields } = row.candidate;
  return (
    <>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar firstName={fields.firstName} lastName={fields.lastName ?? undefined} size="sm" />
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, dimmed && styles.dimmed]} numberOfLines={1}>
          {row.name}
        </Text>
        {row.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
    </>
  );
}

function Choice({
  label,
  checked,
  onPress,
  name,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  name: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${label}, ${name}`}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[styles.choice, checked && styles.choiceOn]}
    >
      <Text style={[styles.choiceText, checked && styles.choiceTextOn]}>
        {checked ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

/** One contact in the picker. Memoised: the list holds hundreds of rows. */
export const ContactRow = memo(function ContactRow({
  row,
  selected,
  onToggle,
  onChoose,
}: ContactRowProps) {
  const key = row.candidate.key;
  const described = [row.name, row.subtitle].filter(Boolean).join(', ');

  if (row.status === 'already') {
    return (
      <View
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel={`${described}, already in KnowThem`}
        accessibilityState={{ checked: false, disabled: true }}
        style={[styles.row, styles.dimmedRow]}
      >
        <Identity row={row} dimmed />
        <View style={styles.already}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.alreadyText}>Already in KnowThem</Text>
        </View>
      </View>
    );
  }

  if (row.status === 'duplicate') {
    return (
      <View style={styles.duplicate}>
        <View style={styles.duplicateTop}>
          <Identity row={row} />
        </View>
        <View style={styles.badgeRow}>
          <Badge label="Possible duplicate" color={colors.warning} />
        </View>
        {row.note ? <Text style={styles.note}>{row.note}</Text> : null}
        <View accessibilityRole="radiogroup" style={styles.choices}>
          <Choice
            label="Skip"
            name={row.name}
            checked={!selected}
            onPress={() => onChoose(key, false)}
          />
          <Choice
            label="Import anyway"
            name={row.name}
            checked={selected}
            onPress={() => onChoose(key, true)}
          />
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={described}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={() => onToggle(key)}
      style={styles.row}
    >
      <Identity row={row} />
      <View style={styles.box}>
        <View style={[styles.tick, selected && styles.tickOn]}>
          {selected ? <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} /> : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  dimmedRow: { opacity: 0.7 },
  text: { flex: 1 },
  name: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  dimmed: { color: colors.textSecondary },
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary },
  box: {
    width: minTapTarget,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  already: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  alreadyText: { fontSize: fontSizes.xs, color: colors.textSecondary },
  duplicate: {
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  duplicateTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeRow: { flexDirection: 'row' },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary },
  choices: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    minHeight: minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: fontSizes.sm, color: colors.text },
  choiceTextOn: { color: colors.textOnPrimary, fontWeight: fontWeights.medium },
});
