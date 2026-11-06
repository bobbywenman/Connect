import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandTitle } from '@/components';
import { sessionActions } from '@/store/session';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <BrandTitle subtitle="Remember the people in your life" />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log in"
          style={styles.button}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Log in</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign up"
          style={styles.button}
          onPress={() => router.push('/sign-up')}
        >
          <Text style={styles.buttonText}>Sign up</Text>
        </Pressable>
        {/* TEMPORARY: dev shortcut, removed when real sign-in lands in KT-07. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue (dev sign-in)"
          style={styles.button}
          onPress={() => sessionActions.signIn({ onboardingComplete: true })}
        >
          <Text style={styles.buttonText}>Continue (dev sign-in)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  actions: { marginTop: 32, gap: 12, alignSelf: 'stretch' },
  button: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 16, color: '#1E3A5F' },
});
