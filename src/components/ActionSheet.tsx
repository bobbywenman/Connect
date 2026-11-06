import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, minTapTarget, radii, spacing } from '@/constants';

export interface SheetAction {
  label: string;
  onPress: () => void;
  /** Red text for actions that lose data. Never the only signal: the label says what happens. */
  destructive?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: readonly SheetAction[];
  cancelLabel?: string;
}

/**
 * A bottom sheet of actions, used as both a menu and a confirmation dialog. It is an in-app
 * modal rather than `Alert`, because Alert menus do nothing on web and iOS cannot show an
 * Alert while a modal is still closing. Pressing an action closes nothing by itself: the
 * caller decides (so a menu item can swap the sheet's content for a confirmation).
 */
export function ActionSheet({
  visible,
  onClose,
  title,
  message,
  actions,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
          style={styles.scrim}
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          {title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Text style={[styles.actionText, action.destructive && styles.destructive]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={onClose}
            style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.pressed]}
          >
            <Text style={[styles.actionText, styles.cancelText]}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.base,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  action: {
    minHeight: minTapTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
  },
  pressed: { opacity: 0.7 },
  actionText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text },
  destructive: { color: colors.error },
  cancel: { marginTop: spacing.sm, backgroundColor: colors.background },
  cancelText: { color: colors.accent },
});
