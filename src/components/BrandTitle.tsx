import { StyleSheet, Text } from 'react-native';

export interface BrandTitleProps {
  subtitle?: string;
}

/** App wordmark. Placeholder until the design system lands in KT-03. */
export function BrandTitle({ subtitle }: BrandTitleProps) {
  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        KnowThem
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', color: '#1E3A5F' },
  subtitle: { fontSize: 16, color: '#555555', marginTop: 8 },
});
