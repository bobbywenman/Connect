import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, TextField } from '@/components';
import {
  colors,
  fontSizes,
  fontWeights,
  minTapTarget,
  networkColors,
  radii,
  spacing,
} from '@/constants';

import { networkTypeLabels, resolveNetworkColor } from '../colors';
import {
  networkTypes,
  validateNetworkForm,
  type NetworkFormErrors,
  type NetworkFormValues,
} from '../schemas';

export interface NetworkFormProps {
  initialValues?: Partial<NetworkFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  /** Error from the save request, shown above the button. */
  submitError?: string | null;
  onSubmit: (values: NetworkFormValues) => void;
  /** Extra content below the save button, e.g. the delete action. */
  footer?: ReactNode;
}

const SWATCH_SIZE = minTapTarget;

/** Shared create / edit form: name, type, color, with a live preview. */
export function NetworkForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  submitError,
  onSubmit,
  footer,
}: NetworkFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [type, setType] = useState<string>(initialValues?.type ?? 'custom');
  const [color, setColor] = useState<string>(
    initialValues?.color ?? networkColors[0]?.name ?? 'blue',
  );
  const [errors, setErrors] = useState<NetworkFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const revalidate = (next: { name: string; type: string; color: string }) => {
    if (submitted) setErrors(validateNetworkForm(next));
  };

  const changeName = (value: string) => {
    setName(value);
    revalidate({ name: value, type, color });
  };

  const submit = () => {
    setSubmitted(true);
    const found = validateNetworkForm({ name, type, color });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({ name: name.trim(), type: type as NetworkFormValues['type'], color });
  };

  const previewName = name.trim() || 'Network name';
  const previewType = networkTypeLabels[type] ?? type;

  return (
    <View style={styles.form}>
      <Card accessibilityLabel={`Preview: ${previewName}, ${previewType} network`}>
        <View testID="network-preview" style={styles.preview}>
          <View
            testID="network-preview-bar"
            style={[styles.previewBar, { backgroundColor: resolveNetworkColor(color) }]}
          />
          <View style={styles.previewBody}>
            <Text
              style={[styles.previewName, !name.trim() && styles.previewPlaceholder]}
              numberOfLines={1}
            >
              {previewName}
            </Text>
            <Text style={styles.previewMeta}>{previewType} · Preview</Text>
          </View>
        </View>
      </Card>

      <TextField
        label="Name"
        value={name}
        onChangeText={changeName}
        placeholder="e.g. Wenman Family"
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={submit}
        error={errors.name}
        testID="network-name-input"
      />

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Type</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Network type" style={styles.types}>
          {networkTypes.map((t) => {
            const selected = t === type;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityLabel={networkTypeLabels[t]}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => {
                  setType(t);
                  revalidate({ name, type: t, color });
                }}
                style={[styles.type, selected && styles.typeSelected]}
              >
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                  {networkTypeLabels[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.type ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errors.type}
          </Text>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Color</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Network color"
          style={styles.swatches}
        >
          {networkColors.map((c) => {
            const selected = c.name === color;
            return (
              <ColorSwatch
                key={c.name}
                name={c.name}
                value={c.value}
                selected={selected}
                onPress={() => {
                  setColor(c.name);
                  revalidate({ name, type, color: c.name });
                }}
              />
            );
          })}
        </View>
        {errors.color ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errors.color}
          </Text>
        ) : null}
      </View>

      {submitError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {submitError}
        </Text>
      ) : null}

      <Button label={submitLabel} onPress={submit} isLoading={isSubmitting} size="lg" />
      {footer}
    </View>
  );
}

interface ColorSwatchProps {
  name: string;
  value: string;
  selected: boolean;
  onPress: () => void;
}

/** One 44pt color option. Selection shows as a ring and a check mark, never color alone. */
function ColorSwatch({ name, value, selected, onPress }: ColorSwatchProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={[styles.swatchHit, selected && styles.swatchRing]}
    >
      <View style={[styles.swatch, { backgroundColor: value }]}>
        {selected ? (
          <Ionicons
            testID={`swatch-check-${name}`}
            name="checkmark"
            size={22}
            color={colors.textOnPrimary}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const RING = 3;

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  preview: { flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  previewBar: { width: 4, borderRadius: radii.pill },
  previewBody: { flex: 1, gap: spacing.xs, paddingLeft: spacing.md },
  previewName: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  previewPlaceholder: { color: colors.textSecondary },
  previewMeta: { fontSize: fontSizes.sm, color: colors.textSecondary },
  group: { gap: spacing.sm },
  groupLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  type: {
    minHeight: minTapTarget,
    minWidth: minTapTarget,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel: { fontSize: fontSizes.base, color: colors.text },
  typeLabelSelected: { color: colors.textOnPrimary, fontWeight: fontWeights.bold },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatchHit: {
    width: SWATCH_SIZE + RING * 2,
    height: SWATCH_SIZE + RING * 2,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: RING,
    borderColor: 'transparent',
  },
  swatchRing: { borderColor: colors.text },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
