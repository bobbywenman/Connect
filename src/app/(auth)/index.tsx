import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandTitle, Button, Screen } from '@/components';
import { spacing } from '@/constants';
import { supabase } from '@/lib/supabase';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.brand}>
          <BrandTitle subtitle="Remember the people in your life" />
        </View>
        <View style={styles.actions}>
          <Button label="Create account" size="lg" onPress={() => router.push('/sign-up')} />
          <Button
            label="Log in"
            variant="secondary"
            size="lg"
            onPress={() => router.push('/login')}
          />
          {__DEV__ ? (
            <Button
              label="Use demo account (dev)"
              variant="ghost"
              onPress={() => {
                // Seeded local demo user (supabase/seed.sql). Auth state flows into the session store.
                void supabase.auth.signInWithPassword({
                  email: 'demo@knowthem.app',
                  password: 'password123',
                });
              }}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  brand: { alignItems: 'center' },
  actions: { gap: spacing.md, alignSelf: 'stretch' },
});
