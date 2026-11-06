import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { formatPersonCount, resolveNetworkColor } from '@/features/networks/colors';
import type { NetworkSummary } from '@/features/networks/api';

import type { EventSummary } from '../api';
import { formatEventDate, formatRelativeDay } from '../dates';

export interface EventCardProps {
  event: EventSummary;
  /** The linked network, when there is one and it has loaded. */
  network?: Pick<NetworkSummary, 'name' | 'color'>;
  today: string;
  onPress: (eventId: string) => void;
}

/** One event in the Events list: name, date with a relative phrase, place, people, network. */
export const EventCard = memo(function EventCard({
  event,
  network,
  today,
  onPress,
}: EventCardProps) {
  const date = event.eventDate ? formatEventDate(event.eventDate, today) : 'No date';
  const relative = event.eventDate ? formatRelativeDay(event.eventDate, today) : null;
  const people =
    event.attendeeCount > 0 ? formatPersonCount(event.attendeeCount) : 'No one added yet';
  const label = [
    event.name,
    relative ? `${date}, ${relative}` : date,
    event.location,
    people,
    network?.name,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      onPress={() => onPress(event.id)}
      accessibilityLabel={label}
      accessibilityHint="Opens the event"
    >
      <View style={styles.titleRow}>
        <Text numberOfLines={2} style={styles.name}>
          {event.name}
        </Text>
        {network ? (
          <View
            testID="event-network-dot"
            style={[styles.dot, { backgroundColor: resolveNetworkColor(network.color) }]}
          />
        ) : null}
      </View>
      <Text style={styles.date}>
        {date}
        {relative ? <Text style={styles.relative}>{`  ·  ${relative}`}</Text> : null}
      </Text>
      {event.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text numberOfLines={1} style={styles.meta}>
            {event.location}
          </Text>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.meta}>{people}</Text>
        {network ? (
          <Text numberOfLines={1} style={[styles.meta, styles.networkName]}>
            {network.name}
          </Text>
        ) : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  dot: { width: 12, height: 12, borderRadius: 6 },
  date: {
    marginTop: spacing.xs,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  relative: { fontWeight: fontWeights.regular, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { fontSize: fontSizes.sm, color: colors.textSecondary },
  networkName: { flex: 1, textAlign: 'right' },
});
