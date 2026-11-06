import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, minTapTarget } from '@/constants';
import { useNetwork } from '@/features/networks/hooks';
import {
  NetworkPeopleScreen,
  StudyHeaderButton,
} from '@/features/people/components/NetworkPeopleScreen';

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
            <View style={styles.headerActions}>
              <StudyHeaderButton networkId={id} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit network"
                onPress={() => router.push({ pathname: '/network/[id]/edit', params: { id } })}
                style={styles.headerButton}
              >
                <Ionicons name="create-outline" size={24} color={colors.primary} />
              </Pressable>
            </View>
          ),
        }}
      />
      <NetworkPeopleScreen networkId={id} networkColor={network?.color} />
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
