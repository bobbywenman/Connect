import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { PersonFormScreen } from '@/features/people/components/PersonFormScreen';
import { useSelfPerson } from '@/features/people/hooks';

export interface MyProfileFormProps {
  /** Called after a save or a cancel; the route decides where to go. */
  onDone: () => void;
}

/** Edits the signed-in user's self person with the shared person form (KT-11). */
export function MyProfileForm({ onDone }: MyProfileFormProps) {
  const self = useSelfPerson();

  if (self.isPending) {
    return (
      <Screen>
        <Text style={styles.body}>Loading…</Text>
      </Screen>
    );
  }
  if (self.isError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>
            Couldn&apos;t load your profile
          </Text>
          <Text style={styles.body}>Check your connection and try again.</Text>
          <Button label="Retry" onPress={() => void self.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!self.data) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>
            Profile not found
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <PersonFormScreen mode="edit" personId={self.data.id} onSaved={onDone} onCancel={onDone} />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
});
