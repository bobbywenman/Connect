import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';

import { Button } from '@/components';
import { colors, fontSizes, fontWeights } from '@/constants';
import { startRecoverySession } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { mapAuthError } from '@/features/auth/errors';
import { FormError } from '@/features/auth/FormError';
import { FormTextField } from '@/features/auth/FormTextField';
import { useUpdatePassword } from '@/features/auth/hooks';
import { parseRecoveryLink } from '@/features/auth/recoveryLink';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';
import { useSession } from '@/store/session';

type Phase = 'verifying' | 'ready' | 'invalid' | 'done';

/** How long to wait for the OS to hand us the launch URL before calling the link invalid. */
const LINK_WAIT_MS = 2000;

/** The URL that opened this screen: the page URL on web, the deep link on native (null until known). */
function useIncomingUrl(): string | null {
  const nativeUrl = Linking.useLinkingURL();
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.href;
  return nativeUrl;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = useIncomingUrl();
  const link = useMemo(() => parseRecoveryLink(url), [url]);
  const recovery = useSession((s) => s.recovery);
  const setRecovery = useSession((s) => s.setRecovery);
  const [outcome, setOutcome] = useState<'invalid' | 'done' | null>(null);
  const handled = useRef(false); // links are single-use; never process one twice
  const update = useUpdatePassword();
  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // A recovery session (from our own exchange, or PASSWORD_RECOVERY emitted by the client) means ready.
  let phase: Phase = 'verifying';
  if (outcome === 'done') phase = 'done';
  else if (outcome === 'invalid' || link.kind === 'error') phase = 'invalid';
  else if (recovery) phase = 'ready';

  useEffect(() => {
    if (link.kind === 'none') {
      if (recovery) return;
      // The OS may not have handed us the launch URL yet; give up if it never arrives.
      const timer = setTimeout(() => setOutcome((o) => o ?? 'invalid'), LINK_WAIT_MS);
      return () => clearTimeout(timer);
    }
    if (link.kind === 'error' || handled.current) return;
    handled.current = true;
    startRecoverySession(link).then(
      () => setRecovery(true),
      () => setOutcome('invalid'),
    );
  }, [link, recovery, setRecovery]);

  const onSubmit = handleSubmit(({ password }) =>
    update.mutate(password, { onSuccess: () => setOutcome('done') }),
  );

  // The gate exempts this screen from its signed-in redirect (so a cold-start deep link isn't
  // bounced), so leave explicitly: clear the flag and go to '/', where the gate sends the
  // signed-in user on to the app (or onboarding).
  const finish = () => {
    setRecovery(false);
    router.replace('/');
  };

  if (phase === 'verifying') {
    return (
      <AuthLayout>
        <Text accessibilityRole="header" style={styles.title}>
          Checking your link
        </Text>
        <ActivityIndicator accessibilityLabel="Checking your reset link" color={colors.primary} />
      </AuthLayout>
    );
  }

  if (phase === 'invalid') {
    return (
      <AuthLayout>
        <Text accessibilityRole="header" style={styles.title}>
          This link has expired
        </Text>
        <Text accessibilityRole="alert" style={styles.body}>
          This reset link is invalid or has already been used. Request a new one and try again.
        </Text>
        <Button
          label="Request a new link"
          onPress={() => {
            setRecovery(false);
            router.replace('/forgot-password');
          }}
        />
      </AuthLayout>
    );
  }

  if (phase === 'done') {
    return (
      <AuthLayout>
        <Text accessibilityRole="header" style={styles.title}>
          Password updated
        </Text>
        <Text accessibilityRole="alert" style={styles.body}>
          Your password has been changed. You&apos;re signed in.
        </Text>
        <Button label="Continue" onPress={finish} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Text accessibilityRole="header" style={styles.title}>
        Choose a new password
      </Text>
      <FormTextField
        control={control}
        name="password"
        label="New password"
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
        label="Confirm new password"
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />
      <FormError message={update.error ? mapAuthError(update.error) : null} />
      <Button label="Save password" isLoading={update.isPending} onPress={() => void onSubmit()} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.text },
});
