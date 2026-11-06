import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Screen } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';

import type { NewThisMonthPerson } from '../api';
import { useNewThisMonth } from '../hooks';
import { newPersonLabel } from '../newThisMonth';
import { usePhotoUrls } from '../photoHooks';
import { PersonRow } from './PersonRow';

/** Everyone added this month, newest first, with a button to study them. */
export function NewThisMonthScreen() {
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useNewThisMonth();
  const [pulling, setPulling] = useState(false);
  const people = data ?? [];
  // One request for every photo in the list, not one per row.
  const { data: photoUrls } = usePhotoUrls(people.map((p) => p.photo_path));

  const openPerson = useCallback(
    (id: string) => router.push({ pathname: '/person/[id]', params: { id } }),
    [router],
  );
  const studyThese = () => router.push('/study/session?deck=recent');

  const onRefresh = async () => {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: NewThisMonthPerson }) => (
      <PersonRow
        person={item}
        label={newPersonLabel(
          item.networks.map((n) => n.name),
          item.created_at,
        )}
        onPress={openPerson}
        photoUrl={item.photo_path ? (photoUrls?.[item.photo_path] ?? null) : null}
      />
    ),
    [openPerson, photoUrls],
  );

  let body;
  if (isPending) {
    body = (
      <View style={styles.centered} accessibilityLabel="Loading new people">
        <ActivityIndicator />
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Couldn&apos;t load new people
        </Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Button label="Retry" onPress={() => void refetch()} isLoading={isRefetching} />
      </View>
    );
  } else if (people.length === 0) {
    body = (
      <View style={styles.centered}>
        <EmptyState
          title="Nobody new this month"
          subtitle="People you add this month will show up here."
        />
      </View>
    );
  } else {
    body = (
      <>
        <View style={styles.actions}>
          <Button
            label="Study these"
            accessibilityHint="Starts a study session with the people added this month"
            onPress={studyThese}
          />
        </View>
        <FlashList
          testID="new-this-month-list"
          data={people}
          renderItem={renderItem}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} />
          }
        />
      </>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <View style={styles.body}>{body}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  actions: { paddingBottom: spacing.base },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  errorTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  errorBody: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
});
