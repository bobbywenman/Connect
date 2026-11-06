import { useLocalSearchParams } from 'expo-router';

import { ImportContactsScreen } from '@/features/import/components/ImportContactsScreen';

export default function ImportContactsRoute() {
  const { networkId } = useLocalSearchParams<{ networkId?: string }>();
  return <ImportContactsScreen networkId={networkId} />;
}
