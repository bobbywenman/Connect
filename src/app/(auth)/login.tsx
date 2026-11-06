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
import { useSignIn } from '@/features/auth/hooks';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // On success the session store flips to signedIn and the route gate navigates away.
  const onSubmit = handleSubmit((values) => signIn.mutate(values));

  return (
    <AuthLayout>
      <Text accessibilityRole="header" style={styles.title}>
        Log in
      </Text>
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
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />
      <FormError message={signIn.error ? mapAuthError(signIn.error) : null} />
      <Button label="Log in" isLoading={signIn.isPending} onPress={() => void onSubmit()} />
      <Button
        label="Forgot password?"
        variant="ghost"
        onPress={() => router.push('/forgot-password')}
      />
      <Button
        label="Create an account"
        variant="ghost"
        onPress={() => router.replace('/sign-up')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text },
});
