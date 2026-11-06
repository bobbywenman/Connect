import { Stack, useLocalSearchParams } from 'expo-router';

import { useNetworks } from '@/features/networks/hooks';
import {
  NetworkPeopleScreen,
  StudyHeaderButton,
} from '@/features/people/components/NetworkPeopleScreen';

export default function NetworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: networks } = useNetworks();
  const network = networks?.find((n) => n.id === id);
  return (
    <>
      <Stack.Screen
        options={{
          title: network?.name ?? 'Network',
          headerRight: () => <StudyHeaderButton networkId={id} />,
        }}
      />
      <NetworkPeopleScreen networkId={id} networkColor={network?.color} />
    </>
  );
}
