import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, spacing } from '@/constants';

import { ensureReminderPermission } from '../permissions';
import { scheduleTestReminder } from '../scheduler';

/** Dev-only (render under `__DEV__`): fires a birthday notification in one minute. */
export function DevReminderTest() {
  const [message, setMessage] = useState<string | null>(null);
  const run = async () => {
    try {
      if ((await ensureReminderPermission()) !== 'granted') {
        setMessage('Notifications are not allowed. Enable them in system Settings.');
        return;
      }
      const result = await scheduleTestReminder();
      setMessage(
        result
          ? `Scheduled for ${result.name} in 1 minute. Background the app.`
          : 'No person with a birthday found.',
      );
    } catch {
      setMessage('Could not schedule the test reminder.');
    }
  };
  return (
    <>
      <Button label="Test reminder in 1 minute" variant="secondary" onPress={() => void run()} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  message: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
});
