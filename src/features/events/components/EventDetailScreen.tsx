import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Screen } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';
import { resolveNetworkColor } from '@/features/networks/colors';
import { useNetworks } from '@/features/networks/hooks';
import { fullName } from '@/features/people/listing';
import { usePhotoUrls } from '@/features/people/photoHooks';

import type { EventAttendee } from '../api';
import { confirmDeleteEvent } from '../confirmDelete';
import { formatEventDate, formatRelativeDay, todayIso } from '../dates';
import { useDeleteEvent, useEvent } from '../hooks';

function Message({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <Screen>
      <View style={styles.centered}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {onRetry ? <Button label="Retry" onPress={onRetry} /> : null}
      </View>
    </Screen>
  );
}

/** One event: when, where, which network, who is going, and the way into studying for it. */
export function EventDetailScreen({ eventId }: { eventId: string }) {
  const router = useRouter();
  const event = useEvent(eventId);
  const { data: networks } = useNetworks();
  const remove = useDeleteEvent();
  const photoUrls = usePhotoUrls((event.data?.attendees ?? []).map((a) => a.photo_path)).data;

  if (event.isPending) return <Message title="Loading…" />;
  if (event.isError) {
    return (
      <Message
        title="Couldn't load this event"
        body="Check your connection and try again."
        onRetry={() => void event.refetch()}
      />
    );
  }
  // Also what shows for a moment after a delete, before navigation completes.
  if (!event.data) return <Message title="Event not found" />;

  const { data } = event;
  const today = todayIso();
  const network = data.networkId ? networks?.find((n) => n.id === data.networkId) : undefined;
  const hasAttendees = data.attendees.length > 0;

  const openPerson = (id: string) => router.push({ pathname: '/person/[id]', params: { id } });
  const study = () => router.push({ pathname: '/study/session', params: { eventId: data.id } });
  const editAttendees = () =>
    router.push({ pathname: '/event/[id]/attendees', params: { id: data.id } });
  const edit = () => router.push({ pathname: '/event/[id]/edit', params: { id: data.id } });
  const confirmDelete = async () => {
    if (!(await confirmDeleteEvent(data.name))) return;
    try {
      await remove.mutateAsync(data.id);
      if (router.canGoBack()) router.back();
      else router.replace('/events');
    } catch {
      // Surfaced through remove.isError below.
    }
  };

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.name}>
          {data.name}
        </Text>

        <View style={styles.facts}>
          {data.eventDate ? (
            <View style={styles.factRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.fact}>
                {formatEventDate(data.eventDate, today)}
                <Text
                  style={styles.relative}
                >{`  ·  ${formatRelativeDay(data.eventDate, today)}`}</Text>
              </Text>
            </View>
          ) : null}
          {data.location ? (
            <View style={styles.factRow}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.fact}>{data.location}</Text>
            </View>
          ) : null}
          {network ? (
            <View
              accessible
              accessibilityLabel={`Network: ${network.name}`}
              style={[styles.networkChip, { borderColor: resolveNetworkColor(network.color) }]}
            >
              <View style={[styles.dot, { backgroundColor: resolveNetworkColor(network.color) }]} />
              <Text style={styles.networkText}>{network.name}</Text>
            </View>
          ) : null}
        </View>

        {data.description ? <Text style={styles.description}>{data.description}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {hasAttendees ? `Who's going (${data.attendees.length})` : "Who's going"}
          </Text>
          <Button
            label={hasAttendees ? 'Edit attendees' : 'Add people'}
            variant="secondary"
            size="sm"
            onPress={editAttendees}
          />
        </View>

        {hasAttendees ? (
          <View style={styles.attendees}>
            {data.attendees.map((person) => (
              <AttendeeRow
                key={person.id}
                person={person}
                photoUrl={person.photo_path ? (photoUrls?.[person.photo_path] ?? null) : null}
                onPress={openPerson}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No one added yet</Text>
        )}

        <Button
          label={hasAttendees ? 'Study for this event' : 'Add people to study'}
          disabled={!hasAttendees}
          onPress={study}
          size="lg"
        />

        <View style={styles.actions}>
          <Button label="Edit" variant="secondary" onPress={edit} style={styles.action} />
          <Button
            label="Delete"
            variant="danger"
            isLoading={remove.isPending}
            onPress={() => void confirmDelete()}
            style={styles.action}
          />
        </View>
        {remove.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            Couldn&apos;t delete this event. Check your connection and try again.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function AttendeeRow({
  person,
  photoUrl,
  onPress,
}: {
  person: EventAttendee;
  photoUrl: string | null;
  onPress: (personId: string) => void;
}) {
  const name = fullName(person);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Opens the profile"
      onPress={() => onPress(person.id)}
      style={({ pressed }) => [styles.attendee, pressed && styles.pressed]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Avatar
          firstName={person.first_name}
          lastName={person.last_name ?? undefined}
          photoUrl={photoUrl}
          photoCacheKey={
            person.photo_path ? `${person.photo_path}?v=${person.updated_at}` : undefined
          }
          size="sm"
        />
      </View>
      <Text numberOfLines={1} style={styles.attendeeName}>
        {name}
        {person.is_self ? ' (You)' : ''}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textSecondary}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
  name: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text },
  facts: { gap: spacing.sm },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fact: { flex: 1, fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  relative: { fontWeight: fontWeights.regular, color: colors.textSecondary },
  networkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  networkText: { fontSize: fontSizes.sm, color: colors.text },
  description: { fontSize: fontSizes.base, color: colors.text, lineHeight: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  attendees: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  attendee: {
    minHeight: minTapTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
  },
  pressed: { opacity: 0.7 },
  attendeeName: { flex: 1, fontSize: fontSizes.base, color: colors.text },
  empty: { fontSize: fontSizes.base, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
