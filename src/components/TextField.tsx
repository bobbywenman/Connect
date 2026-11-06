import { useId } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

export interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'multiline'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'returnKeyType'
  | 'onBlur'
  | 'onSubmitEditing'
> {
  label: string;
  error?: string;
  testID?: string;
}

export function TextField({ label, error, multiline, testID, ...inputProps }: TextFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  return (
    <View style={styles.container}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        testID={testID}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
      />
      {error ? (
        <Text nativeID={errorId} accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  input: {
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.base,
    color: colors.text,
    backgroundColor: colors.background,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error, borderWidth: 2 },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
