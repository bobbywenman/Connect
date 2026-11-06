import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, spacing } from '@/constants';

import type { NewThisMonthPerson } from '../api';
import { photoCacheKey } from '../detail';
import { useNewThisMonth } from '../hooks';
import { fullName } from '../listing';
import { usePhotoUrls } from '../photoHooks';

/** How many people the home strip shows; "See all" lists the rest. */
export const HOME_STRIP_LIMIT = 8;

/** Home-screen section: people added this month. Renders nothing while loading or when there are none. */
export function NewThisMonthSection() {
  const { data } = useNewThisMonth();
  if (!data || data.length === 0) return null;
  return <NewThisMonthStrip people={data} />;
}

function NewThisMonthStrip({ people }: { people: NewThisMonthPerson[] }) {
  const router = useRouter();
  const shown = people.slice(0, HOME_STRIP_LIMIT);
  // One request for the photos of the whole strip.
  const { data: photoUrls } = usePhotoUrls(shown.map((p) => p.photo_path));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.heading}>
          {`New this month · ${people.length}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all new this month"
          onPress={() => router.push('/people/new-this-month')}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
        >
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.strip}
      >
        {shown.map((person) => (
          <NewPersonChip
            key={person.id}
            person={person}
            photoUrl={person.photo_path ? (photoUrls?.[person.photo_path] ?? null) : null}
            onPress={(id) => router.push({ pathname: '/person/[id]', params: { id } })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface NewPersonChipProps {
  person: NewThisMonthPerson;
  photoUrl: string | null;
  onPress: (personId: string) => void;
}

function NewPersonChip({ person, photoUrl, onPress }: NewPersonChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fullName(person)}
      accessibilityHint="Opens the profile"
      onPress={() => onPress(person.id)}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      {/* The button's own label already says the name; keep the avatar out of the a11y tree. */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar
          firstName={person.first_name}
          lastName={person.last_name ?? undefined}
          photoUrl={photoUrl}
          photoCacheKey={photoCacheKey(person)}
        />
      </View>
      <Text numberOfLines={1} style={styles.chipName}>
        {person.first_name}
      </Text>
    </Pressable>
  );
}

const CHIP_WIDTH = 76;

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heading: { flex: 1, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  seeAll: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  seeAllText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.primary,
  },
  strip: { gap: spacing.sm, paddingVertical: spacing.xxs },
  chip: {
    width: CHIP_WIDTH,
    minHeight: minTapTarget,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipName: {
    maxWidth: CHIP_WIDTH,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
    textAlign: 'center',
  },
  pressed: { backgroundColor: colors.surface },
});
