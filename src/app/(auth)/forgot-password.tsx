import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, fontWeights } from '@/constants';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { mapAuthError } from '@/features/auth/errors';
import { FormError } from '@/features/auth/FormError';
import { FormTextField } from '@/features/auth/FormTextField';
import { useRequestPasswordReset } from '@/features/auth/hooks';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';

const RESET_CONFIRMATION =
  "If an account exists for that email, we've sent a reset link. Check your inbox.";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const reset = useRequestPasswordReset();
  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) =>
    // knowthem://reset-password in builds; an http URL on web and in Expo dev.
    reset.mutate({ email, redirectTo: Linking.createURL('/reset-password') }),
  );

  return (
    <AuthLayout>
      <Text accessibilityRole="header" style={styles.title}>
        Forgot password
      </Text>
      {reset.isSuccess ? (
        <>
          {/* Same message whether or not the email has an account. */}
          <Text accessibilityRole="alert" style={styles.body}>
            {RESET_CONFIRMATION}
          </Text>
          <Button label="Back to log in" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Enter your email and we&apos;ll send you a link to choose a new password.
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
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />
          <FormError message={reset.error ? mapAuthError(reset.error) : null} />
          <Button
            label="Send reset link"
            isLoading={reset.isPending}
            onPress={() => void onSubmit()}
          />
          <Button label="Back to log in" variant="ghost" onPress={() => router.replace('/login')} />
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.text },
});
