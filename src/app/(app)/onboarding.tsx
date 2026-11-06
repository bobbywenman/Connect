import { Pressable, StyleSheet, Text } from 'react-native';

import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';
import { useCompleteOnboarding } from '@/features/profile/hooks';

export default function OnboardingScreen() {
  const completeOnboarding = useCompleteOnboarding();
  return (
    <ScreenPlaceholder title="Onboarding">
      {/* TEMPORARY: stands in for finishing onboarding until the real flow lands. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finish onboarding (dev)"
        style={styles.button}
        onPress={() => completeOnboarding.mutate()}
      >
        <Text style={styles.buttonText}>Finish onboarding (dev)</Text>
      </Pressable>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
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
