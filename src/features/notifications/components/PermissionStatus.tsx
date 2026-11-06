import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, spacing } from '@/constants';

import { openNotificationSettings, type ReminderPermission } from '../permissions';

export interface PermissionStatusProps {
  /** undefined while the system state is still being read. */
  status: ReminderPermission | undefined;
  /** Shows the system prompt (only possible while the permission is undetermined). */
  onEnable: () => void;
}

/** Says whether the system lets KnowThem show notifications, with the one action that fixes it. */
export function PermissionStatus({ status, onEnable }: PermissionStatusProps) {
  if (status === undefined) {
    return <Text style={styles.text}>Checking notification settings…</Text>;
  }
  if (status === 'granted') {
    return <Text style={styles.text}>Notifications are on</Text>;
  }
  if (status === 'denied') {
    return (
      <View style={styles.stack}>
        <Text style={styles.text}>Notifications are off. Reminders won&apos;t show up.</Text>
        <Button
          label="Open Settings"
          variant="secondary"
          accessibilityHint="Opens system Settings so you can allow notifications"
          onPress={() => void openNotificationSettings()}
        />
      </View>
    );
  }
  if (status === 'undetermined') {
    return (
      <View style={styles.stack}>
        <Text style={styles.text}>Not asked yet</Text>
        <Button
          label="Turn on"
          variant="secondary"
          accessibilityHint="Asks permission to show reminder notifications"
          onPress={onEnable}
        />
      </View>
    );
  }
  return <Text style={styles.text}>Notifications aren&apos;t available on this device.</Text>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm, alignItems: 'flex-start' },
  text: { fontSize: fontSizes.base, color: colors.text },
});
