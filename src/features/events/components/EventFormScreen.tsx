import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';

import { eventToFormInput } from '../formValues';
import { useCreateEvent, useEvent, useUpdateEvent } from '../hooks';
import { emptyEventForm, type EventFormValues } from '../schemas';
import { EventForm } from './EventForm';

type Props = {
  onSaved: (eventId: string) => void;
  onCancel: () => void;
} & ({ mode: 'create' } | { mode: 'edit'; eventId: string });

const SAVE_ERROR = "Couldn't save. Check your connection and try again.";

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

/** Loads what the form needs (networks, and the event when editing), then renders it. */
export function EventFormScreen(props: Props) {
  return props.mode === 'create' ? <CreateScreen {...props} /> : <EditScreen {...props} />;
}

function CreateScreen({ onSaved, onCancel }: Extract<Props, { mode: 'create' }>) {
  const networks = useNetworks();
  const create = useCreateEvent();

  if (networks.isPending) return <Message title="Loading…" />;
  if (networks.isError) {
    return (
      <Message
        title="Couldn't load your networks"
        body="Check your connection and try again."
        onRetry={() => void networks.refetch()}
      />
    );
  }

  const submit = async (values: EventFormValues) => {
    try {
      const event = await create.mutateAsync(values);
      onSaved(event.id);
    } catch {
      // Surfaced through create.error below; the form keeps the user's input.
    }
  };

  return (
    <EventForm
      title="New event"
      initialValues={emptyEventForm}
      networks={networks.data}
      isSaving={create.isPending}
      submitError={create.isError ? SAVE_ERROR : null}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}

function EditScreen({ eventId, onSaved, onCancel }: Extract<Props, { mode: 'edit' }>) {
  const networks = useNetworks();
  const event = useEvent(eventId);
  const update = useUpdateEvent(eventId);

  if (networks.isPending || event.isPending) return <Message title="Loading…" />;
  if (networks.isError || event.isError) {
    return (
      <Message
        title="Couldn't load this event"
        body="Check your connection and try again."
        onRetry={() => {
          void networks.refetch();
          void event.refetch();
        }}
      />
    );
  }
  if (!event.data) return <Message title="Event not found" />;

  const submit = async (values: EventFormValues) => {
    try {
      await update.mutateAsync(values);
      onSaved(eventId);
    } catch {
      // Surfaced through update.error below; the form keeps the user's input.
    }
  };

  return (
    <EventForm
      title="Edit event"
      initialValues={eventToFormInput(event.data)}
      networks={networks.data}
      isSaving={update.isPending}
      submitError={update.isError ? SAVE_ERROR : null}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  body: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
});
