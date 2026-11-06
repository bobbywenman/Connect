import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { PersonFormScreen } from '@/features/people/components/PersonFormScreen';

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PersonFormScreen
        mode="edit"
        personId={id}
        onSaved={(savedId) => router.replace({ pathname: '/person/[id]', params: { id: savedId } })}
        onCancel={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </>
  );
}
