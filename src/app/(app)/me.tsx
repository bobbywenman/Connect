import { Stack, useRouter } from 'expo-router';

import { MyProfileForm } from '@/features/profile/components/MyProfileForm';

/** The signed-in user's own profile (the self person, D-2), edited with the person form. */
export default function MyProfileScreen() {
  const router = useRouter();
  const done = () => (router.canGoBack() ? router.back() : router.replace('/settings'));
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MyProfileForm onDone={done} />
    </>
  );
}
