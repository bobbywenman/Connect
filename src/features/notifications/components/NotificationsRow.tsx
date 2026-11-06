import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

/** Settings row that opens the notification settings (KT-37). */
export function NotificationsRow() {
  const router = useRouter();
  return (
    <Card
      onPress={() => router.push('/settings/notifications')}
      accessibilityLabel="Notifications"
      accessibilityHint="Choose when birthday and anniversary reminders come"
    >
      <View style={styles.text}>
        <Text style={styles.name}>Notifications</Text>
        <Text style={styles.hint}>Birthday and anniversary reminders</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  text: { gap: spacing.xxs },
  name: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  hint: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
