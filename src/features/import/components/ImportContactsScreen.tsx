import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';
import { peopleForDuplicateCheckQuery, dismissalsQuery } from '@/features/people/duplicateHooks';
import { queryKeys } from '@/lib/queryKeys';

import { listImportedSourceIds } from '../api';
import { contactsToCandidates } from '../contactMapping';
import {
  getContactsAccess,
  isContactImportSupported,
  loadDeviceContacts,
  requestContactsAccess,
} from '../contacts';
import { importCandidates, type ImportProgress, type ImportResult } from '../importer';
import { attachContactPhoto } from '../photos';
import {
  buildReviewRows,
  candidatesToImport,
  countSkipped,
  type ReviewRow,
  type SkipCounts,
} from '../review';
import type { ImportCandidate } from '../types';
import { ImportPicker } from './ImportPicker';
import { ImportSummary } from './ImportSummary';

type Phase =
  | { name: 'checking' }
  | { name: 'intro' }
  | { name: 'denied'; canAskAgain: boolean }
  | { name: 'loading' }
  | { name: 'error' }
  | { name: 'pick' }
  | { name: 'importing' }
  | { name: 'done'; result: ImportResult; skipped: SkipCounts };

interface Loaded {
  candidates: ImportCandidate[];
  existing: Awaited<ReturnType<NonNullable<typeof peopleForDuplicateCheckQuery.queryFn>>>;
  dismissals: Awaited<ReturnType<NonNullable<typeof dismissalsQuery.queryFn>>>;
  importedIds: Set<string>;
  limited: boolean;
}

export interface ImportContactsScreenProps {
  /** The network the person came from; the default target. */
  networkId?: string;
}

/** Import from the phone's address book: explain, ask permission, pick, import, summarise. */
export function ImportContactsScreen({ networkId }: ImportContactsScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const networks = useNetworks();

  const [phase, setPhase] = useState<Phase>({ name: 'checking' });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string | undefined>(networkId);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({ done: 0, total: 0 });

  const loadEverything = useCallback(
    async (limited: boolean) => {
      setPhase({ name: 'loading' });
      try {
        // Always fresh: already-imported ids and duplicates must reflect what is saved right now.
        const fresh = { staleTime: 0 };
        const [contacts, existing, dismissals, importedIds] = await Promise.all([
          loadDeviceContacts(),
          queryClient.fetchQuery({ ...peopleForDuplicateCheckQuery, ...fresh }),
          queryClient.fetchQuery({ ...dismissalsQuery, ...fresh }),
          queryClient.fetchQuery({
            queryKey: queryKeys.importedIds('contacts'),
            queryFn: () => listImportedSourceIds('contacts'),
            ...fresh,
          }),
        ]);
        setLoaded({
          candidates: contactsToCandidates(contacts),
          existing,
          dismissals,
          importedIds,
          limited,
        });
        setSelected(new Set());
        setPhase({ name: 'pick' });
      } catch {
        setPhase({ name: 'error' });
      }
    },
    [queryClient],
  );

  const afterAccess = useCallback(
    (access: Awaited<ReturnType<typeof getContactsAccess>>) => {
      if (access.state === 'granted') return loadEverything(access.limited);
      if (access.state === 'denied') setPhase({ name: 'denied', canAskAgain: access.canAskAgain });
      else setPhase({ name: 'intro' });
      return Promise.resolve();
    },
    [loadEverything],
  );

  // If access was granted before, skip the explanation and go straight to the list.
  useEffect(() => {
    if (!isContactImportSupported) return;
    let cancelled = false;
    getContactsAccess()
      .then((access) => {
        if (cancelled) return;
        // A first-time "denied" that can still be asked again (Android) gets the explainer.
        if (access.state === 'denied' && access.canAskAgain) setPhase({ name: 'intro' });
        else void afterAccess(access);
      })
      .catch(() => !cancelled && setPhase({ name: 'intro' }));
    return () => {
      cancelled = true;
    };
  }, [afterAccess]);

  // Default the target to the first network when none was passed (or it no longer exists).
  const networkList = useMemo(() => networks.data ?? [], [networks.data]);
  const targetId =
    target && networkList.some((n) => n.id === target) ? target : (networkList[0]?.id ?? target);

  const networkNames = useMemo(
    () => new Map(networkList.map((n) => [n.id, n.name])),
    [networkList],
  );
  const rows: ReviewRow[] = useMemo(
    () =>
      loaded
        ? buildReviewRows({
            candidates: loaded.candidates,
            existing: loaded.existing,
            dismissals: loaded.dismissals,
            importedIds: loaded.importedIds,
            networkId: targetId,
            networkNames,
          })
        : [],
    [loaded, targetId, networkNames],
  );
  const toImport = useMemo(() => candidatesToImport(rows, selected), [rows, selected]);

  const askPermission = async () => {
    try {
      await afterAccess(await requestContactsAccess());
    } catch {
      setPhase({ name: 'error' });
    }
  };

  const runImport = async () => {
    if (!targetId || toImport.length === 0) return;
    const skipped = countSkipped(rows, selected);
    setProgress({ done: 0, total: toImport.length });
    setPhase({ name: 'importing' });
    const result = await importCandidates(toImport, {
      networkId: targetId,
      onProgress: setProgress,
      attachPhoto: includePhotos ? attachContactPhoto : undefined,
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['persons'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.networks.all }),
    ]);
    setPhase({ name: 'done', result, skipped });
  };

  const finish = () => {
    if (targetId) router.dismissTo({ pathname: '/network/[id]', params: { id: targetId } });
    else router.back();
  };

  const busy = phase.name === 'importing';
  const header = (
    <Stack.Screen
      options={{ title: 'Import contacts', gestureEnabled: !busy, headerBackVisible: !busy }}
    />
  );

  if (!isContactImportSupported) {
    return (
      <View style={styles.centered}>
        {header}
        <EmptyState
          title="Not available on the web"
          subtitle="Contact import is available in the iOS and Android app."
          icon={<Ionicons name="phone-portrait-outline" size={48} color={colors.textSecondary} />}
          ctaLabel="Go back"
          onCtaPress={() => router.back()}
        />
      </View>
    );
  }

  switch (phase.name) {
    case 'checking':
    case 'loading':
      return (
        <View style={styles.centered}>
          {header}
          <ActivityIndicator size="large" color={colors.primary} />
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {phase.name === 'loading' ? 'Reading your contacts…' : 'Checking access…'}
          </Text>
        </View>
      );

    case 'intro':
      return (
        <View style={styles.centered}>
          {header}
          <Ionicons name="people-outline" size={56} color={colors.primary} />
          <Text accessibilityRole="header" style={styles.title}>
            Add people from your contacts
          </Text>
          <Text style={styles.body}>
            KnowThem will read your contacts to let you choose who to add. Nothing is uploaded until
            you import.
          </Text>
          <Button label="Continue" onPress={() => void askPermission()} />
          <Button label="Not now" variant="ghost" onPress={() => router.back()} />
        </View>
      );

    case 'denied':
      return (
        <View style={styles.centered}>
          {header}
          <Ionicons name="lock-closed-outline" size={56} color={colors.textSecondary} />
          <Text accessibilityRole="header" style={styles.title}>
            Contacts access is off
          </Text>
          <Text style={styles.body}>
            KnowThem can&apos;t see your contacts. You can turn on access for KnowThem in Settings,
            then come back.
          </Text>
          <Button label="Open Settings" onPress={() => void Linking.openSettings()} />
          {phase.canAskAgain ? (
            <Button label="Try again" variant="secondary" onPress={() => void askPermission()} />
          ) : null}
          <Button label="Not now" variant="ghost" onPress={() => router.back()} />
        </View>
      );

    case 'error':
      return (
        <View style={styles.centered}>
          {header}
          <Text accessibilityRole="header" style={styles.title}>
            Couldn&apos;t read your contacts
          </Text>
          <Text style={styles.body}>Check your connection and try again.</Text>
          <Button label="Retry" onPress={() => void getContactsAccess().then(afterAccess)} />
        </View>
      );

    case 'importing': {
      const percent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
      return (
        <View style={styles.centered}>
          {header}
          <ActivityIndicator size="large" color={colors.primary} />
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>
            Importing {progress.done} of {progress.total}
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: progress.total, now: progress.done }}
            style={styles.track}
          >
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.body}>
            {includePhotos ? 'Adding photos can take a while. ' : ''}Please keep the app open.
          </Text>
        </View>
      );
    }

    case 'done':
      return (
        <View style={styles.flex}>
          {header}
          <ImportSummary result={phase.result} skipped={phase.skipped} onDone={finish} />
        </View>
      );

    case 'pick':
      return (
        <View style={styles.flex}>
          {header}
          <ImportPicker
            rows={rows}
            selected={selected}
            onSelectedChange={setSelected}
            networks={networkList}
            targetNetworkId={targetId}
            onTargetChange={setTarget}
            onCreateNetwork={() => router.push('/network/new')}
            includePhotos={includePhotos}
            onIncludePhotosChange={setIncludePhotos}
            importCount={toImport.length}
            onImport={() => void runImport()}
            limitedAccess={loaded?.limited}
            onOpenSettings={() => void Linking.openSettings()}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  body: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  track: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: colors.primary },
});
