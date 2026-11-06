import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

import type { ImportResult } from '../importer';
import type { SkipCounts } from '../review';

export interface ImportSummaryProps {
  result: ImportResult;
  skipped: SkipCounts;
  onDone: () => void;
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

/** What happened: imported / skipped / failed, with the reason for each failure. */
export function ImportSummary({ result, skipped, onDone }: ImportSummaryProps) {
  const skippedTotal = skipped.already + skipped.duplicates;
  const failed = result.failed.length;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons
          name={failed > 0 ? 'alert-circle' : 'checkmark-circle'}
          size={48}
          color={failed > 0 ? colors.warning : colors.success}
          importantForAccessibility="no"
        />
        <Text accessibilityRole="header" style={styles.title}>
          {result.imported === 1 ? 'Imported 1 person' : `Imported ${result.imported} people`}
        </Text>
      </View>

      <View style={styles.lines}>
        <Line label="Imported" value={result.imported} />
        <Line label="Skipped" value={skippedTotal} />
        <Line label="Failed" value={failed} />
      </View>
      {skippedTotal > 0 ? (
        <Text style={styles.note}>
          Skipped: {skipped.already} already in KnowThem, {skipped.duplicates} possible duplicates.
        </Text>
      ) : null}
      {result.photosFailed > 0 ? (
        <Text style={styles.note}>
          {result.photosFailed} photo{result.photosFailed === 1 ? '' : 's'} could not be added. You
          can add them from each person&apos;s profile.
        </Text>
      ) : null}
      {result.birthdaysWithoutYear > 0 ? (
        <Text style={styles.note}>
          {result.birthdaysWithoutYear} contact
          {result.birthdaysWithoutYear === 1 ? ' has' : 's have'} a birthday without a year. Those
          birthdays were not imported yet.
        </Text>
      ) : null}

      {failed > 0 ? (
        <View style={styles.failures}>
          <Text accessibilityRole="header" style={styles.failuresTitle}>
            Could not import
          </Text>
          {result.failed.map((f, i) => (
            <FailureRow key={`${f.name}-${i}`} name={f.name} reason={f.reason} />
          ))}
        </View>
      ) : null}

      <Button label="Done" onPress={onDone} />
    </ScrollView>
  );
}

function FailureRow({ name, reason }: { name: string; reason: string }) {
  return (
    <View accessible accessibilityLabel={`${name}: ${reason}`} style={styles.failure}>
      <Text style={styles.failureName}>{name}</Text>
      <Text style={styles.failureReason}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.base, gap: spacing.md },
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.base },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  lines: { gap: spacing.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  lineLabel: { fontSize: fontSizes.base, color: colors.text },
  lineValue: { fontSize: fontSizes.base, fontWeight: fontWeights.bold, color: colors.text },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary },
  failures: { gap: spacing.sm, paddingVertical: spacing.sm },
  failuresTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.bold, color: colors.error },
  failure: { gap: spacing.xxs },
  failureName: { fontSize: fontSizes.base, color: colors.text },
  failureReason: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
