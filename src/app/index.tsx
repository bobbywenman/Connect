import { StyleSheet, View } from 'react-native';

import { BrandTitle } from '@/components';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <BrandTitle subtitle="Remember the people in your life" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
