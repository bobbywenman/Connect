import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/constants';

export interface ReviewStepProps {
  /** "Sarah is Maria's mother-in-law" */
  sentence: string;
  /** "Maria is Sarah's daughter-in-law" */
  inverseSentence: string;
  /** Why saving is blocked or failed. */
  error?: string | null;
  /** True when saving cannot work (a duplicate), so Save is disabled. */
  blocked?: boolean;
  isSaving: boolean;
  /** "Save" or "Save changes". */
  saveLabel: string;
  onSave: () => void;
}

/** Step 3: both sides in plain words, then Save. */
export function ReviewStep({
  sentence,
  inverseSentence,
  error,
  blocked = false,
  isSaving,
  saveLabel,
  onSave,
}: ReviewStepProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} testID="relationship-review-step">
      <Text accessibilityRole="header" style={styles.heading}>
        Does this look right?
      </Text>
      <View style={styles.card}>
        <Text style={styles.sentence}>{sentence}</Text>
        <View style={styles.divider} />
        <Text style={styles.sentence}>{inverseSentence}</Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button label={saveLabel} onPress={onSave} isLoading={isSaving} disabled={blocked} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.base, gap: spacing.lg },
  heading: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text },
  card: {
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  sentence: { fontSize: fontSizes.lg, lineHeight: 28, color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  error: { fontSize: fontSizes.base, color: colors.error },
});
