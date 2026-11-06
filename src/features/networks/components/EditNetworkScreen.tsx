import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmDialog, Screen } from '@/components';
import { colors, fontSizes, spacing } from '@/constants';

import { deleteNetworkMessage, deleteNetworkTitle } from '../deleteMessage';
import {
  useCountPeopleOnlyInNetwork,
  useDeleteNetwork,
  useNetwork,
  useUpdateNetwork,
} from '../hooks';
import { NetworkForm } from './NetworkForm';

/** Edit a network, or delete it after a confirmation that states what will be removed. */
export function EditNetworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: network, isPending, isError, refetch } = useNetwork(id);
  const update = useUpdateNetwork(id);
  const remove = useDeleteNetwork(id);
  const count = useCountPeopleOnlyInNetwork(id);
  const [onlyPeople, setOnlyPeople] = useState<number | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/networks'));

  const askToDelete = () => count.mutate(undefined, { onSuccess: (n) => setOnlyPeople(n) });

  const confirmDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        setOnlyPeople(null);
        router.dismissTo('/networks');
      },
    });

  if (isPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel="Loading network" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError || !network) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.message}>
            {isError ? "Couldn't load this network" : 'This network no longer exists'}
          </Text>
          {isError ? <Button label="Retry" onPress={() => void refetch()} /> : null}
          <Button label="Go back" variant="secondary" onPress={close} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <NetworkForm
        initialValues={{
          name: network.name,
          type: network.type as 'family',
          color: network.color ?? undefined,
        }}
        submitLabel="Save changes"
        isSubmitting={update.isPending}
        submitError={update.isError ? "Couldn't save your changes. Please try again." : null}
        onSubmit={(values) => update.mutate(values, { onSuccess: close })}
        footer={
          <View style={styles.danger}>
            <Button
              label="Delete network"
              variant="danger"
              isLoading={count.isPending}
              onPress={askToDelete}
              accessibilityHint="Asks you to confirm before anything is deleted"
            />
            {count.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                Couldn&apos;t check who would be removed. Please try again.
              </Text>
            ) : null}
            {remove.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                Couldn&apos;t delete the network. Nothing was changed.
              </Text>
            ) : null}
          </View>
        }
      />
      <ConfirmDialog
        visible={onlyPeople !== null}
        title={deleteNetworkTitle(network.name)}
        message={deleteNetworkMessage(onlyPeople ?? 0)}
        confirmLabel="Delete"
        destructive
        isLoading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setOnlyPeople(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  message: { fontSize: fontSizes.lg, color: colors.text, textAlign: 'center' },
  danger: { gap: spacing.sm, marginTop: spacing.base },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
