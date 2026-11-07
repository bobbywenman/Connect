import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

import { photoCacheKey } from '../detail';
import { fullName, type NetworkPerson } from '../listing';

export interface PersonRowProps {
  person: NetworkPerson;
  /** Second line (see `primaryLabel`); ignored for the self person, who shows "You". */
  label: string | null;
  onPress: (personId: string) => void;
  /** Opens the row's action menu (long-press, or the screen reader's action). */
  onLongPress?: (personId: string) => void;
  /** Signed URL of the person's photo (see `usePhotoUrls`), if loaded. */
  photoUrl?: string | null;
}

/** One row of the people list. Memoised: the list re-renders on every keystroke of search. */
export const PersonRow = memo(function PersonRow({
  person,
  label,
  onPress,
  onLongPress,
  photoUrl,
}: PersonRowProps) {
  const name = fullName(person);
  const archived = !!person.archived_at;
  const subtitle = person.is_self ? 'You' : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, subtitle, archived ? 'Archived' : null].filter(Boolean).join(', ')}
      accessibilityHint="Opens the profile"
      onPress={() => onPress(person.id)}
      onLongPress={onLongPress ? () => onLongPress(person.id) : undefined}
      accessibilityActions={
        onLongPress ? [{ name: 'longpress', label: 'Add relationship' }] : undefined
      }
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') onLongPress?.(person.id);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, archived && styles.archived]}
    >
      {/* The row's own label already says the name; keep the avatar out of the a11y tree. */}
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
          <Text numberOfLines={1} style={[styles.label, person.is_self && styles.selfLabel]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {archived ? (
        <View>
          <Badge label="Archived" color={colors.textSecondary} />
        </View>
      ) : null}
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
  archived: { opacity: 0.6 },
  text: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  selfLabel: { color: colors.primary, fontWeight: fontWeights.bold },
});
