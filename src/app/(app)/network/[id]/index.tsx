import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { colors, minTapTarget } from '@/constants';
import { ScreenPlaceholder } from '@/features/navigation/ScreenPlaceholder';
import { useNetwork } from '@/features/networks/hooks';

// The people list arrives in KT-16; for now this screen is the entry point to editing.
export default function NetworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: network } = useNetwork(id);

  return (
    <>
      <Stack.Screen
        options={{
          title: network?.name ?? 'Network',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit network"
              onPress={() => router.push({ pathname: '/network/[id]/edit', params: { id } })}
              style={{
                minWidth: minTapTarget,
                minHeight: minTapTarget,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScreenPlaceholder title={network?.name ?? `Network ${id}`} />
    </>
  );
}
