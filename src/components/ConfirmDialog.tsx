import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fontWeights, radii, spacing } from '@/constants';

import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  destructive?: boolean;
  isLoading?: boolean;
  /** Optional third action shown above the two main buttons (e.g. "Review"). Needs `onNeutral`. */
  neutralLabel?: string;
  onNeutral?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation dialog. Used instead of `Alert.alert`, which does nothing on web,
 * so the same flow works on iOS, Android and the web preview.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
  neutralLabel,
  onNeutral,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Dismiss dialog"
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          disabled={isLoading}
        />
        <View accessibilityRole="alert" accessibilityLabel={title} style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          {neutralLabel && onNeutral ? (
            <Button
              label={neutralLabel}
              variant="secondary"
              onPress={onNeutral}
              disabled={isLoading}
            />
          ) : null}
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={isLoading}
              style={styles.action}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              isLoading={isLoading}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  message: { fontSize: fontSizes.base, color: colors.text, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { flex: 1 },
});
