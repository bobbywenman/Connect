import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

export interface FormSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Basic is always open and shows a plain header with no toggle. */
  collapsible?: boolean;
}

/** A titled group of fields whose header is an accessible expand/collapse button. */
export function FormSection({
  title,
  expanded,
  onToggle,
  children,
  collapsible = true,
}: FormSectionProps) {
  return (
    <View style={styles.section}>
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={onToggle}
          style={styles.header}
        >
          <Text style={styles.title}>{title}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
            accessible={false}
          />
        </Pressable>
      ) : (
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
      )}
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  header: {
    minHeight: minTapTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface,
  },
  title: { fontSize: fontSizes.base, fontWeight: fontWeights.bold, color: colors.text },
  body: { gap: spacing.base, padding: spacing.base },
});
