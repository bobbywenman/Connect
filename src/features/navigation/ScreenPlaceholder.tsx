import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ScreenPlaceholderProps {
  title: string;
  children?: ReactNode;
}

/** Plain placeholder body for routes whose real UI lands in later tickets. */
export function ScreenPlaceholder({ title, children }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1E3A5F' },
});
