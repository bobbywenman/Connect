import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, fontWeights } from '@/constants';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { mapAuthError } from '@/features/auth/errors';
import { FormError } from '@/features/auth/FormError';
import { FormTextField } from '@/features/auth/FormTextField';
import { useSignUp } from '@/features/auth/hooks';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas';

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();
  const { control, handleSubmit, getValues } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  // Without email confirmation the session store flips to signedIn and the gate sends a
  // new user to onboarding. With confirmation on, there is no session yet (see below).
  const onSubmit = handleSubmit((values) => signUp.mutate(values));

  if (signUp.data?.needsEmailConfirmation) {
    return (
      <AuthLayout>
        <Text accessibilityRole="header" style={styles.title}>
          Check your email to confirm
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          We sent a confirmation link to {getValues('email').trim()}. Open it, then come back and
          log in.
        </Text>
        <Button label="Go to log in" onPress={() => router.replace('/login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Text accessibilityRole="header" style={styles.title}>
        Create account
      </Text>
      <FormTextField
        control={control}
        name="name"
        label="Name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <FormTextField
        control={control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormTextField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />
      <FormTextField
        control={control}
        name="confirmPassword"
        label="Confirm password"
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />
      <FormError message={signUp.error ? mapAuthError(signUp.error) : null} />
      <Button label="Create account" isLoading={signUp.isPending} onPress={() => void onSubmit()} />
      <Button
        label="I already have an account"
        variant="ghost"
        onPress={() => router.replace('/login')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.text },
});
