import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  /** Icon or illustration slot, rendered above the title. */
  icon?: ReactNode;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ title, subtitle, icon, ctaLabel, onCtaPress }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {icon}
        </View>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCtaPress ? <Button label={ctaLabel} onPress={onCtaPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center' },
});
