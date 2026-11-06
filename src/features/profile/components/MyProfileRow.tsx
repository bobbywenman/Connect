import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { useSelfPerson } from '@/features/people/hooks';

/** Settings row that opens the signed-in user's own profile ("You", D-2). */
export function MyProfileRow() {
  const router = useRouter();
  const self = useSelfPerson();
  const person = self.data;
  const name = person
    ? [person.first_name, person.last_name].filter(Boolean).join(' ')
    : self.isPending
      ? 'Loading…'
      : 'My profile';

  return (
    <Card
      onPress={() => router.push('/me')}
      accessibilityLabel={`My profile: ${name}`}
      accessibilityHint="Edit your profile"
    >
      <View style={styles.row}>
        {person ? (
          <Avatar firstName={person.first_name} lastName={person.last_name ?? undefined} />
        ) : null}
        <View style={styles.text}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.hint}>Edit your profile</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  hint: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
