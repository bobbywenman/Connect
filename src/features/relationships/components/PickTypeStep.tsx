import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

import type { CustomRelationshipType } from '../api';
import { inverseQuestion, typeQuestion, type TypeChoice } from '../flow';
import { listByCategory, MAX_CUSTOM_LABEL_LENGTH, type PersonName } from '../labels';

export interface PickTypeStepProps {
  from: PersonName;
  to: PersonName;
  /** The current choice, shown as selected (set when changing an existing relationship). */
  initial?: TypeChoice;
  /** Custom label pairs the person saved before. */
  savedCustom: readonly CustomRelationshipType[];
  onChoose: (choice: TypeChoice) => void;
}

/** Step 2: "Sarah is Maria's…" then Family / Professional / Social / Other options. */
export function PickTypeStep({ from, to, initial, savedCustom, onChoose }: PickTypeStepProps) {
  const initialCustom = initial?.typeId === 'custom' ? initial.custom : undefined;
  const [label, setLabel] = useState(initialCustom?.label ?? '');
  const [inverse, setInverse] = useState(initialCustom?.inverseLabel ?? '');

  const trimmed = label.trim();
  const tooLong = (text: string) => Array.from(text.trim()).length > MAX_CUSTOM_LABEL_LENGTH;
  const labelError = tooLong(label)
    ? `Use ${MAX_CUSTOM_LABEL_LENGTH} characters or fewer.`
    : undefined;
  const inverseError = tooLong(inverse)
    ? `Use ${MAX_CUSTOM_LABEL_LENGTH} characters or fewer.`
    : undefined;
  const canContinue = trimmed.length > 0 && !labelError && !inverseError;

  const submitCustom = () => {
    if (!canContinue) return;
    onChoose({
      typeId: 'custom',
      custom: { label: trimmed, inverseLabel: inverse.trim() || undefined },
    });
  };

  // Saved pairs offered both ways round, so "Landlord" and "Tenant" are each one tap.
  const suggestions = savedCustom.flatMap((s) =>
    s.label.toLowerCase() === s.inverse_label.toLowerCase()
      ? [{ label: s.label, inverse: s.inverse_label }]
      : [
          { label: s.label, inverse: s.inverse_label },
          { label: s.inverse_label, inverse: s.label },
        ],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="relationship-type-step"
    >
      <Text accessibilityRole="header" style={styles.heading}>
        {typeQuestion(from, to)}
      </Text>

      {listByCategory().map((group) => {
        const predefined = group.types.filter((t) => t.id !== 'custom');
        const hasCustom = group.types.some((t) => t.id === 'custom');
        return (
          <View key={group.category} style={styles.group}>
            <Text accessibilityRole="header" style={styles.groupTitle}>
              {group.label}
            </Text>
            {predefined.length > 0 ? (
              <View style={styles.wrap}>
                {predefined.map((t) => (
                  <Option
                    key={t.id}
                    label={t.label}
                    selected={initial?.typeId === t.id}
                    onPress={() => onChoose({ typeId: t.id })}
                  />
                ))}
              </View>
            ) : null}
            {hasCustom ? (
              <View style={styles.custom}>
                <Text style={styles.customTitle}>Something else</Text>
                {suggestions.length > 0 ? (
                  <View style={styles.wrap}>
                    {suggestions.map((s) => (
                      <Option
                        key={`${s.label}/${s.inverse}`}
                        label={s.label}
                        hint={`Fills in ${s.label} and ${s.inverse}`}
                        selected={
                          label.trim().toLowerCase() === s.label.toLowerCase() &&
                          (inverse.trim() || label.trim()).toLowerCase() === s.inverse.toLowerCase()
                        }
                        onPress={() => {
                          setLabel(s.label);
                          setInverse(s.inverse === s.label ? '' : s.inverse);
                        }}
                      />
                    ))}
                  </View>
                ) : null}
                <TextField
                  label="Custom label"
                  placeholder="e.g. Landlord"
                  value={label}
                  onChangeText={setLabel}
                  autoCapitalize="sentences"
                  error={labelError}
                />
                <TextField
                  label={inverseQuestion(from, to)}
                  placeholder="Optional, e.g. Tenant"
                  value={inverse}
                  onChangeText={setInverse}
                  autoCapitalize="sentences"
                  error={inverseError}
                  onSubmitEditing={submitCustom}
                />
                <Button label="Continue" onPress={submitCustom} disabled={!canContinue} />
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function Option({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <Ionicons
          name="checkmark"
          size={18}
          color={colors.textOnPrimary}
          importantForAccessibility="no"
        />
      ) : null}
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.base, paddingBottom: spacing.xl, gap: spacing.lg },
  heading: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text },
  group: { gap: spacing.sm },
  groupTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  optionText: { fontSize: fontSizes.base, color: colors.text },
  optionTextSelected: { color: colors.textOnPrimary, fontWeight: fontWeights.medium },
  custom: {
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  customTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
});
