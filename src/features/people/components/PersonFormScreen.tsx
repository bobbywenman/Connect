import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';

import { defaultNetworkIds, newPersonFormInput, personToFormInput } from '../formValues';
import { useCreatePerson, usePerson, useUpdatePerson } from '../hooks';
import { useApplyPhotoChange, usePhotoUrl } from '../photoHooks';
import type { PhotoChange } from '../photos';
import type { PersonFormValues } from '../schemas';
import { PersonForm } from './PersonForm';

type Props = {
  onSaved: (personId: string) => void;
  onCancel: () => void;
} & ({ mode: 'create'; networkId?: string } | { mode: 'edit'; personId: string });

/** The person is already saved at this point, so a photo failure is a notice, not a blocker. */
function warnPhotoFailed() {
  const title = "Saved, but the photo didn't upload";
  const body = 'Open the person and try adding the photo again.';
  if (Platform.OS === 'web') window.alert(`${title}\n${body}`);
  else Alert.alert(title, body);
}

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
  const applyPhoto = useApplyPhotoChange();

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

  const submit = async (values: PersonFormValues, photo: PhotoChange) => {
    const { networkIds, ...fields } = values;
    try {
      const person = await create.mutateAsync({ fields, networkIds });
      if (photo.kind !== 'unchanged') {
        await applyPhoto.mutateAsync({ person, change: photo }).catch(warnPhotoFailed);
      }
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
      isSaving={create.isPending || applyPhoto.isPending}
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
  const applyPhoto = useApplyPhotoChange();
  const photoPath = person.data?.photo_path;
  const photoVersion = person.data?.updated_at;
  const photoUrl = usePhotoUrl(photoPath, photoVersion);

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
  const submit = async (values: PersonFormValues, photo: PhotoChange) => {
    const { networkIds, ...fields } = values;
    try {
      const saved = await update.mutateAsync({
        fields,
        networkIds: isSelf ? undefined : networkIds,
      });
      if (photo.kind !== 'unchanged') {
        await applyPhoto
          .mutateAsync({
            person: { ...saved, photo_path: person.data?.photo_path ?? null },
            change: photo,
          })
          .catch(warnPhotoFailed);
      }
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
      isSaving={update.isPending || applyPhoto.isPending}
      photoUrl={photoUrl}
      photoCacheKey={photoPath ? `${photoPath}?v=${photoVersion}` : undefined}
      hasPhoto={!!photoPath}
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
