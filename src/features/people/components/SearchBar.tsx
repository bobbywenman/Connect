import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Number of filter groups with a selection; shown on the Filter button. */
  activeFilterCount: number;
  onOpenFilters: () => void;
}

/** Search field plus Filter button, side by side. */
export function SearchBar({
  value,
  onChangeText,
  activeFilterCount,
  onOpenFilters,
}: SearchBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textSecondary}
          importantForAccessibility="no"
        />
        <TextInput
          testID="people-search"
          accessibilityLabel="Search people"
          placeholder="Search people"
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          style={styles.input}
        />
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onChangeText('')}
            style={styles.clear}
          >
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          activeFilterCount > 0 ? `Filter, ${activeFilterCount} active` : 'Filter'
        }
        onPress={onOpenFilters}
        style={[styles.filter, activeFilterCount > 0 && styles.filterActive]}
      >
        <Ionicons
          name="options-outline"
          size={22}
          color={activeFilterCount > 0 ? colors.textOnPrimary : colors.primary}
        />
        {activeFilterCount > 0 ? (
          <Text importantForAccessibility="no" style={styles.count}>
            {activeFilterCount}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: {
    flex: 1,
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: minTapTarget,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  clear: {
    width: minTapTarget,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filter: {
    minWidth: minTapTarget,
    height: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  filterActive: { backgroundColor: colors.primary },
  count: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.textOnPrimary },
});
