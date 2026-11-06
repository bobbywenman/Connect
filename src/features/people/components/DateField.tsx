import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

import { isValidIsoDate, toIsoDate } from '../schemas';

export interface DateFieldProps {
  label: string;
  /** `YYYY-MM-DD`, or '' for no date. On web this is whatever the user has typed so far. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Parse `YYYY-MM-DD` as a local calendar day (not UTC, so the day never shifts). */
function parseLocal(value: string): Date {
  if (!isValidIsoDate(value)) return new Date();
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function formatDisplay(value: string): string {
  return parseLocal(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * A date input that stores `YYYY-MM-DD` strings. Native: a button that opens the system
 * picker (inline on iOS, dialog on Android) with a Clear action. Web: the native date
 * picker is unavailable, so it is a text field that expects `YYYY-MM-DD`; the form schema
 * validates it.
 */
export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextField
        label={`${label} (YYYY-MM-DD)`}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={error}
      />
    );
  }

  const today = new Date();
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ? parseLocal(value) : today,
        mode: 'date',
        maximumDate: undefined,
        onValueChange: (_event, date) => onChange(toIsoDate(date)),
      });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: value ? formatDisplay(value) : 'Not set' }}
          accessibilityState={{ expanded: Platform.OS === 'ios' ? iosOpen : undefined }}
          onPress={open}
          style={[styles.button, error ? styles.buttonError : null]}
        >
          <Text style={value ? styles.value : styles.placeholder}>
            {value ? formatDisplay(value) : 'Not set'}
          </Text>
        </Pressable>
        {value ? (
          <Button
            label="Clear"
            variant="ghost"
            size="sm"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => {
              onChange('');
              setIosOpen(false);
            }}
          />
        ) : null}
      </View>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={value ? parseLocal(value) : today}
          mode="date"
          display="spinner"
          onValueChange={(_event, date) => onChange(toIsoDate(date))}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    flex: 1,
    minHeight: minTapTarget,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  buttonError: { borderColor: colors.error, borderWidth: 2 },
  value: { fontSize: fontSizes.base, color: colors.text },
  placeholder: { fontSize: fontSizes.base, color: colors.textSecondary },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
