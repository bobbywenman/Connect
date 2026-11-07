import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

import { useDuplicatePairs } from '../duplicateHooks';

/** Settings row that opens the possible-duplicates list, with a count badge. */
export function DuplicatesRow() {
  const router = useRouter();
  const { pairs } = useDuplicatePairs();
  const count = pairs.length;
  const summary = count === 0 ? 'None found' : `${count} to review`;

  return (
    <Card
      onPress={() => router.push('/settings/duplicates')}
      accessibilityLabel={`Possible duplicates: ${summary}`}
      accessibilityHint="Review people who may be the same person"
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.name}>Possible duplicates</Text>
          <Text style={styles.hint}>{summary}</Text>
        </View>
        {count > 0 ? <Badge label={String(count)} color={colors.warning} /> : null}
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
