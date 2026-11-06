import { useRouter } from 'expo-router';

import { Screen } from '@/components';

import { useCreateNetwork } from '../hooks';
import { NetworkForm } from './NetworkForm';

/** Create a network. Presented as a modal; closes on save. */
export function NewNetworkScreen() {
  const router = useRouter();
  const create = useCreateNetwork();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/networks'));

  return (
    <Screen scroll>
      <NetworkForm
        submitLabel="Create network"
        isSubmitting={create.isPending}
        submitError={create.isError ? "Couldn't create the network. Please try again." : null}
        onSubmit={(values) => create.mutate(values, { onSuccess: close })}
      />
    </Screen>
  );
}
