import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionSheet, Avatar, Badge, Button, Chip, EmptyState, type SheetAction } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import { displayName } from '@/features/relationships';

import type { DetailNetwork, PersonConnection, PersonDetail } from '../api';
import { daysUntilNext, formatCalendarDate, formatDaysUntil } from '../dates';
import {
  connectionLabel,
  nameParts,
  photoCacheKey,
  relationshipBadges,
  sortConnections,
  textOrNull,
} from '../detail';
import {
  useArchivePerson,
  useDeletePerson,
  usePersonDetail,
  useRemoveFromNetwork,
  useUnarchivePerson,
} from '../hooks';
import { usePhotoUrl, usePhotoUrls } from '../photoHooks';
import { canDeletePerson } from '../rules';

export interface PersonDetailScreenProps {
  personId: string;
  /** Set when opened from a network's list: enables "Remove from <network>". */
  networkId?: string;
  /** Injectable for tests; defaults to now. */
  today?: Date;
}

type Sheet = null | 'menu' | 'delete' | 'lastNetwork';

/** The read-only profile of one person, with the actions that change their status. */
export function PersonDetailScreen({ personId, networkId, today }: PersonDetailScreenProps) {
  const router = useRouter();
  const query = usePersonDetail(personId);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return (
      <Centered>
        <Text accessibilityRole="header" style={styles.stateTitle}>
          Couldn&apos;t load this person
        </Text>
        <Text style={styles.stateBody}>Check your connection and try again.</Text>
        <Button label="Retry" onPress={() => void query.refetch()} isLoading={query.isRefetching} />
      </Centered>
    );
  }
  if (!query.data) {
    return (
      <Centered>
        <Stack.Screen options={{ title: 'Person' }} />
        <EmptyState
          title="Person not found"
          subtitle="They may have been deleted."
          ctaLabel="Go back"
          onCtaPress={leave}
        />
      </Centered>
    );
  }
  return (
    <Loaded detail={query.data} networkId={networkId} today={today ?? new Date()} leave={leave} />
  );
}

function Loaded({
  detail,
  networkId,
  today,
  leave,
}: {
  detail: PersonDetail;
  networkId?: string;
  today: Date;
  leave: () => void;
}) {
  const router = useRouter();
  const { person, networks, connections } = detail;
  const archive = useArchivePerson(person.id);
  const unarchive = useUnarchivePerson(person.id);
  const remove = useDeletePerson(person.id);
  const removeFromNetwork = useRemoveFromNetwork(person.id);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const photoUrl = usePhotoUrl(person.photo_path, person.updated_at);
  const { data: connectionPhotos } = usePhotoUrls(connections.map((c) => c.person.photo_path));

  const first = displayName(person);
  const archived = !!person.archived_at;
  const contextNetwork = networks.find((n) => n.id === networkId);
  const mutating =
    archive.isPending || unarchive.isPending || remove.isPending || removeFromNetwork.isPending;

  /** Run a change, then `then()`; show a message instead when it fails. */
  const run = async (action: () => Promise<unknown>, failure: string, then?: () => void) => {
    setSheet(null);
    setActionError(null);
    try {
      await action();
      then?.();
    } catch {
      setActionError(failure);
    }
  };

  const doArchive = () =>
    run(() => archive.mutateAsync(), `Couldn't archive ${first}. Try again.`, leave);
  const doRestore = () => run(() => unarchive.mutateAsync(), `Couldn't restore ${first}. Try again.`);
  const doDelete = () => run(() => remove.mutateAsync(), `Couldn't delete ${first}. Try again.`, leave);
  const doRemoveFromNetwork = (network: DetailNetwork) =>
    run(
      () => removeFromNetwork.mutateAsync(network.id),
      `Couldn't remove ${first} from ${network.name}. Try again.`,
      leave,
    );

  const startRemoveFromNetwork = (network: DetailNetwork) => {
    // Their last network: removing leaves them in no list at all, so offer delete first.
    if (networks.length <= 1) setSheet('lastNetwork');
    else void doRemoveFromNetwork(network);
  };

  const menuActions: SheetAction[] = [];
  if (!person.is_self) {
    menuActions.push(
      archived
        ? { label: 'Restore', onPress: () => void doRestore() }
        : { label: 'Archive', onPress: () => void doArchive() },
    );
    if (contextNetwork) {
      menuActions.push({
        label: `Remove from ${contextNetwork.name}`,
        onPress: () => startRemoveFromNetwork(contextNetwork),
      });
    }
    if (canDeletePerson(person)) {
      menuActions.push({ label: 'Delete', destructive: true, onPress: () => setSheet('delete') });
    }
  }

  const { name, nickname } = nameParts(person);
  const badges = relationshipBadges(person, connections);
  const info = infoRows(person, today);
  const sections = [
    { title: 'Notes', text: textOrNull(person.notes) },
    { title: 'Fun facts', text: textOrNull(person.fun_facts) },
    { title: 'Conversation starters', text: textOrNull(person.conversation_starters) },
  ];
  const tags = person.tags.map((t) => t.trim()).filter(Boolean);
  const sortedConnections = sortConnections(connections);
  const relationshipCount = connections.length;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: first,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit person"
                onPress={() => router.push({ pathname: '/person/[id]/edit', params: { id: person.id } })}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonText}>Edit</Text>
              </Pressable>
              {menuActions.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More actions"
                  onPress={() => setSheet('menu')}
                  style={styles.headerButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {archived ? (
          <View accessibilityRole="alert" style={styles.banner}>
            <Text style={styles.bannerText}>
              Archived. {first} is hidden from lists and study decks.
            </Text>
            <Button
              label="Restore"
              variant="secondary"
              onPress={() => void doRestore()}
              isLoading={unarchive.isPending}
            />
          </View>
        ) : null}
        {actionError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {actionError}
          </Text>
        ) : null}

        <View style={styles.header}>
          <Avatar
            firstName={person.first_name}
            lastName={person.last_name ?? undefined}
            photoUrl={photoUrl}
            photoCacheKey={photoCacheKey(person)}
            size="xl"
          />
          <Text accessibilityRole="header" style={styles.name}>
            {name}
          </Text>
          {nickname || textOrNull(person.pronouns) ? (
            <Text style={styles.subtitle}>
              {[nickname ? `Goes by ${nickname}` : null, textOrNull(person.pronouns)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          {person.is_self ? <Badge label="You" /> : null}
          {networks.length > 0 ? (
            <View style={styles.wrapRow}>
              {networks.map((n) => (
                <NetworkChip key={n.id} network={n} />
              ))}
            </View>
          ) : null}
        </View>

        {badges.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badges}
            style={styles.badgesScroll}
          >
            {badges.map((b) => (
              <Badge key={b.id} label={b.label} color={colors.accent} />
            ))}
          </ScrollView>
        ) : null}

        {info.length > 0 ? (
          <Section title="Details">
            {info.map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {sections.slice(0, 1).map(renderTextSection)}

        {tags.length > 0 ? (
          <Section title="Groups & tags">
            <View style={styles.wrapRow}>
              {tags.map((t) => (
                <Chip key={t} label={t} />
              ))}
            </View>
          </Section>
        ) : null}

        {sections.slice(1).map(renderTextSection)}

        {sortedConnections.length > 0 ? (
          <Section title={`Connections (${sortedConnections.length})`}>
            {sortedConnections.map((c) => (
              <ConnectionRow
                key={c.relationship.id}
                connection={c}
                label={connectionLabel(person, c)}
                photoUrl={c.person.photo_path ? (connectionPhotos?.[c.person.photo_path] ?? null) : null}
                onPress={() =>
                  router.push({ pathname: '/person/[id]', params: { id: c.person.id } })
                }
              />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      {archived ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add relationship"
          onPress={() =>
            router.push({ pathname: '/relationship/new', params: { personId: person.id } })
          }
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Ionicons name="git-network-outline" size={22} color={colors.textOnPrimary} />
          <Text style={styles.fabText}>Add relationship</Text>
        </Pressable>
      )}

      <ActionSheet
        visible={sheet === 'menu'}
        onClose={() => setSheet(null)}
        title={first}
        actions={menuActions}
      />
      <ActionSheet
        visible={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={`Delete ${first}?`}
        message={
          relationshipCount > 0
            ? `This permanently deletes ${first} and ${relationshipCount} ${relationshipCount === 1 ? 'relationship' : 'relationships'}. It can't be undone. Archive instead to keep them.`
            : `This permanently deletes ${first}. It can't be undone. Archive instead to keep them.`
        }
        actions={[
          { label: `Delete ${first}`, destructive: true, onPress: () => void doDelete() },
        ]}
      />
      <ActionSheet
        visible={sheet === 'lastNetwork'}
        onClose={() => setSheet(null)}
        title={`${first} won't be in any network`}
        message="Delete them instead?"
        actions={[
          { label: `Delete ${first}`, destructive: true, onPress: () => setSheet('delete') },
          ...(contextNetwork
            ? [
                {
                  label: 'Remove anyway',
                  onPress: () => void doRemoveFromNetwork(contextNetwork),
                },
              ]
            : []),
        ]}
      />
      {mutating ? <View pointerEvents="auto" style={styles.busy} /> : null}
    </View>
  );

  function renderTextSection(s: { title: string; text: string | null }) {
    return s.text ? (
      <Section key={s.title} title={s.title}>
        <Text style={styles.body}>{s.text}</Text>
      </Section>
    ) : null;
  }
}

function infoRows(
  person: PersonDetail['person'],
  today: Date,
): { label: string; value: string }[] {
  const dated = (label: string, date: string | null, reminder: string) => {
    const formatted = formatCalendarDate(date);
    if (!formatted) return null;
    const until = formatDaysUntil(daysUntilNext(date, today));
    return { label, value: until ? `${formatted} · ${until}` : formatted, reminder };
  };
  const rows = [
    dated('Birthday', person.birthdate, ''),
    dated('Anniversary', person.anniversary_date, ''),
    { label: 'City', value: textOrNull(person.location_city) },
    { label: 'Job title', value: textOrNull(person.job_title) },
    { label: 'Company', value: textOrNull(person.company) },
    { label: 'Department', value: textOrNull(person.department) },
  ];
  return rows.flatMap((r) => (r && r.value ? [{ label: r.label, value: r.value }] : []));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Network name with its color as a dot; the name carries the meaning, the color is extra. */
function NetworkChip({ network }: { network: DetailNetwork }) {
  const color = resolveNetworkColor(network.color);
  return (
    <View style={[styles.networkChip, { borderColor: color }]}>
      <View style={[styles.networkDot, { backgroundColor: color }]} />
      <Text style={styles.networkChipText}>{network.name}</Text>
    </View>
  );
}

function ConnectionRow({
  connection,
  label,
  photoUrl,
  onPress,
}: {
  connection: PersonConnection;
  label: string;
  photoUrl: string | null;
  onPress: () => void;
}) {
  const { person } = connection;
  const { name } = nameParts(person);
  const subtitle = person.is_self ? `You · ${label}` : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${subtitle}`}
      accessibilityHint="Opens the profile"
      onPress={onPress}
      style={({ pressed }) => [styles.connection, pressed && styles.connectionPressed]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar
          firstName={person.first_name}
          lastName={person.last_name ?? undefined}
          photoUrl={photoUrl}
          photoCacheKey={photoCacheKey(person)}
        />
      </View>
      <View style={styles.connectionText}>
        <Text numberOfLines={1} style={styles.connectionName}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.connectionLabel}>
          {subtitle}
        </Text>
      </View>
      {person.archived_at ? <Badge label="Archived" color={colors.textSecondary} /> : null}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textSecondary}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

function LoadingState() {
  return (
    <View testID="person-loading" accessibilityLabel="Loading person" style={styles.loading}>
      <View style={styles.skeletonAvatar} />
      <View style={[styles.skeletonLine, { width: 180 }]} />
      <View style={[styles.skeletonLine, { width: 120 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.base,
    paddingBottom: 96,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.primary },
  banner: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: { fontSize: fontSizes.base, color: colors.text },
  error: { fontSize: fontSizes.base, color: colors.error },
  header: { alignItems: 'center', gap: spacing.sm },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subtitle: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  networkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  networkDot: { width: 10, height: 10, borderRadius: 5 },
  networkChipText: { fontSize: fontSizes.sm, color: colors.text },
  badgesScroll: { flexGrow: 0, marginHorizontal: -spacing.base },
  badges: { gap: spacing.sm, paddingHorizontal: spacing.base },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: fontSizes.base, color: colors.textSecondary },
  infoValue: { flex: 1, textAlign: 'right', fontSize: fontSizes.base, color: colors.text },
  body: { fontSize: fontSizes.base, lineHeight: 24, color: colors.text },
  connection: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  connectionPressed: { backgroundColor: colors.surface },
  connectionText: { flex: 1, gap: spacing.xxs },
  connectionName: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  connectionLabel: { fontSize: fontSizes.sm, color: colors.textSecondary },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  },
  fabPressed: { opacity: 0.85 },
  fabText: { fontSize: fontSizes.base, fontWeight: fontWeights.bold, color: colors.textOnPrimary },
  busy: { ...StyleSheet.absoluteFillObject },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: colors.background,
  },
  stateTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  stateBody: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  skeletonAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface },
  skeletonLine: { height: 16, borderRadius: radii.sm, backgroundColor: colors.surface },
});
