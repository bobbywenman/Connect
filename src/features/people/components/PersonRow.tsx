import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

import { fullName, type NetworkPerson } from '../listing';

export interface PersonRowProps {
  person: NetworkPerson;
  /** Second line (see `primaryLabel`); ignored for the self person, who shows "You". */
  label: string | null;
  onPress: (personId: string) => void;
}

/** One row of the people list. Memoised: the list re-renders on every keystroke of search. */
export const PersonRow = memo(function PersonRow({ person, label, onPress }: PersonRowProps) {
  const name = fullName(person);
  const subtitle = person.is_self ? 'You' : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${name}, ${subtitle}` : name}
      accessibilityHint="Opens the profile"
      onPress={() => onPress(person.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* The row's own label already says the name; keep the avatar out of the a11y tree. */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar firstName={person.first_name} lastName={person.last_name ?? undefined} />
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.label, person.is_self && styles.selfLabel]}>
            {subtitle}
          </Text>
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

export const PERSON_ROW_HEIGHT = 72;

const styles = StyleSheet.create({
  row: {
    minHeight: PERSON_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  selfLabel: { color: colors.primary, fontWeight: fontWeights.bold },
});
