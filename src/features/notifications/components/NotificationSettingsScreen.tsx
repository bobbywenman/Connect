import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button, RadioGroup, Screen } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, spacing } from '@/constants';
import { FormError } from '@/features/auth/FormError';

import { HOUR_CHOICES, LEAD_DAY_CHOICES } from '../plan';
import {
  useReminderPermissionStatus,
  useReminderSettings,
  useUpdateReminderSettings,
} from '../hooks';

import { PermissionStatus } from './PermissionStatus';

/** Settings > Notifications (KT-37): what reminders are sent, when, and whether the system allows them. */
export function NotificationSettingsScreen() {
  const { settings, isPending, isError, refetch } = useReminderSettings();
  const update = useUpdateReminderSettings();
  const permission = useReminderPermissionStatus();

  if (isPending) {
    return (
      <Screen>
        <Text style={styles.body}>Loading…</Text>
      </Screen>
    );
  }
  if (isError || !settings) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>
            Couldn&apos;t load your notification settings
          </Text>
          <Button label="Retry" onPress={() => void refetch()} />
          <Text style={styles.body}>Check your connection and try again.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          On this device
        </Text>
        <PermissionStatus status={permission.status} onEnable={() => void permission.enable()} />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          Reminders
        </Text>
        {/* A Remind me switch that turns on asks for notification permission the first time (D-16). */}
        <SwitchRow
          label="Birthday reminders"
          value={settings.birthdays}
          onValueChange={(birthdays) => {
            update.mutate({ birthdays });
            if (birthdays) void permission.enable();
          }}
        />
        <SwitchRow
          label="Anniversary reminders"
          value={settings.anniversaries}
          onValueChange={(anniversaries) => {
            update.mutate({ anniversaries });
            if (anniversaries) void permission.enable();
          }}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          Remind me
        </Text>
        <RadioGroup
          label="Remind me"
          options={LEAD_DAY_CHOICES}
          value={settings.leadDays}
          onChange={(leadDays) => update.mutate({ leadDays })}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          Time of day
        </Text>
        <RadioGroup
          label="Time of day"
          options={HOUR_CHOICES}
          value={settings.hour}
          onChange={(hour) => update.mutate({ hour })}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          Summary
        </Text>
        <SwitchRow
          label="Monthly 'new people' summary"
          value={settings.monthlySummary}
          onValueChange={(monthlySummary) => update.mutate({ monthlySummary })}
        />
      </View>

      <FormError
        message={
          update.isError ? "Couldn't save that change. Check your connection and try again." : null
        }
      />
    </Screen>
  );
}

interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function SwitchRow({ label, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg, gap: spacing.sm },
  heading: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  switchRow: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: { flex: 1, fontSize: fontSizes.base, color: colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
});
