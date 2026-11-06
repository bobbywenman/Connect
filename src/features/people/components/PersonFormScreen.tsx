import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';

import { defaultNetworkIds, newPersonFormInput, personToFormInput } from '../formValues';
import { useCreatePerson, usePerson, useUpdatePerson } from '../hooks';
import type { PersonFormValues } from '../schemas';
import { PersonForm } from './PersonForm';

type Props = {
  onSaved: (personId: string) => void;
  onCancel: () => void;
} & ({ mode: 'create'; networkId?: string } | { mode: 'edit'; personId: string });

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

/** Loads what the form needs (networks, and the person when editing), then renders it. */
export function PersonFormScreen(props: Props) {
  return props.mode === 'create' ? <CreateScreen {...props} /> : <EditScreen {...props} />;
}

function CreateScreen({ networkId, onSaved, onCancel }: Extract<Props, { mode: 'create' }>) {
  const networks = useNetworks();
  const create = useCreatePerson();

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

  const submit = async (values: PersonFormValues) => {
    const { networkIds, ...fields } = values;
    try {
      const person = await create.mutateAsync({ fields, networkIds });
      onSaved(person.id);
    } catch {
      // Surfaced through create.error below; the form keeps the user's input.
    }
  };

  return (
    <PersonForm
      title="New person"
      initialValues={newPersonFormInput(defaultNetworkIds(networks.data, networkId))}
      networks={networks.data}
      isSaving={create.isPending}
      submitError={create.isError ? "Couldn't save. Check your connection and try again." : null}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}

function EditScreen({ personId, onSaved, onCancel }: Extract<Props, { mode: 'edit' }>) {
  const networks = useNetworks();
  const person = usePerson(personId);
  const update = useUpdatePerson(personId);

  if (networks.isPending || person.isPending) return <Message title="Loading…" />;
  if (networks.isError || person.isError) {
    return (
      <Message
        title="Couldn't load this person"
        body="Check your connection and try again."
        onRetry={() => {
          void networks.refetch();
          void person.refetch();
        }}
      />
    );
  }
  if (!person.data) return <Message title="Person not found" />;

  const isSelf = person.data.is_self;
  const submit = async (values: PersonFormValues) => {
    const { networkIds, ...fields } = values;
    try {
      await update.mutateAsync({ fields, networkIds: isSelf ? undefined : networkIds });
      onSaved(personId);
    } catch {
      // Surfaced through update.error below; the form keeps the user's input.
    }
  };

  return (
    <PersonForm
      title={isSelf ? 'My profile' : 'Edit person'}
      initialValues={personToFormInput(person.data)}
      networks={networks.data}
      isSelf={isSelf}
      isSaving={update.isPending}
      submitError={update.isError ? "Couldn't save. Check your connection and try again." : null}
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
