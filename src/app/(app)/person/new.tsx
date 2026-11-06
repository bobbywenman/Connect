import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { PersonFormScreen } from '@/features/people/components/PersonFormScreen';

export default function NewPersonScreen() {
  const { networkId } = useLocalSearchParams<{ networkId?: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PersonFormScreen
        mode="create"
        networkId={networkId}
        onSaved={(id) => router.replace({ pathname: '/person/[id]', params: { id } })}
        onCancel={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </>
  );
}
