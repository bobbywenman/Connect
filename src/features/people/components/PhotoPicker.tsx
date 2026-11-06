import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button } from '@/components';
import { colors, fontSizes, minTapTarget, radii, spacing } from '@/constants';

import { preparePhoto, type PhotoChange } from '../photos';

export interface PhotoPickerProps {
  firstName: string;
  lastName?: string;
  /** Signed URL of the saved photo, if any. */
  savedUrl?: string | null;
  /** Cache key for the saved photo (path + version). */
  savedCacheKey?: string;
  /** Whether the person has a saved photo (so "Remove photo" is offered). */
  hasSavedPhoto?: boolean;
  change: PhotoChange;
  onChange: (change: PhotoChange) => void;
}

type Notice = { message: string; settings: boolean } | null;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
};

/**
 * Tap the avatar to take a photo, choose one from the library, or remove it. Permission is
 * requested only when the user picks a source; a denial shows a message (with a button to
 * open Settings on devices) and never throws. The chosen image is cropped square, resized
 * to 500x500 max and stored in `change`; the form uploads it on Save.
 */
export function PhotoPicker({
  firstName,
  lastName,
  savedUrl,
  savedCacheKey,
  hasSavedPhoto = false,
  change,
  onChange,
}: PhotoPickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const isWeb = Platform.OS === 'web';
  const shownUrl = change.kind === 'set' ? change.uri : change.kind === 'remove' ? null : savedUrl;
  const canRemove = change.kind === 'set' || (change.kind === 'unchanged' && hasSavedPhoto);

  const pick = async (source: 'camera' | 'library') => {
    setMenuOpen(false);
    setNotice(null);
    setBusy(true);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice({
          message:
            source === 'camera'
              ? 'KnowThem needs camera access to take a photo. You can turn it on in Settings.'
              : 'KnowThem needs photo library access to choose a photo. You can turn it on in Settings.',
          settings: !isWeb,
        });
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      const uri = await preparePhoto(asset.uri, { width: asset.width, height: asset.height });
      onChange({ kind: 'set', uri });
    } catch {
      setNotice({ message: "Couldn't use that photo. Please try another.", settings: false });
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    setMenuOpen(false);
    setNotice(null);
    onChange(hasSavedPhoto ? { kind: 'remove' } : { kind: 'unchanged' });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change photo"
          accessibilityHint="Opens options to take, choose or remove a photo"
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={() => setMenuOpen(true)}
          style={styles.avatarButton}
        >
          <Avatar
            firstName={firstName}
            lastName={lastName}
            photoUrl={shownUrl}
            photoCacheKey={change.kind === 'unchanged' ? savedCacheKey : undefined}
            size="lg"
          />
        </Pressable>
        <Text style={styles.hint}>{busy ? 'Preparing photo…' : 'Tap to add or change photo'}</Text>
      </View>

      {notice ? (
        <View style={styles.notice}>
          <Text accessibilityRole="alert" style={styles.noticeText}>
            {notice.message}
          </Text>
          {notice.settings ? (
            <Button
              label="Open Settings"
              variant="secondary"
              size="sm"
              onPress={() => void Linking.openSettings().catch(() => undefined)}
            />
          ) : null}
        </View>
      ) : null}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close photo options"
          style={styles.backdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.sheet} accessibilityViewIsModal>
            {!isWeb ? <MenuItem label="Take photo" onPress={() => void pick('camera')} /> : null}
            <MenuItem label="Choose from library" onPress={() => void pick('library')} />
            {canRemove ? <MenuItem label="Remove photo" danger onPress={remove} /> : null}
            <MenuItem label="Cancel" onPress={() => setMenuOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Text style={[styles.itemText, danger && styles.itemDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  avatarButton: { minWidth: minTapTarget, minHeight: minTapTarget },
  hint: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
  notice: { gap: spacing.sm, alignItems: 'flex-start' },
  noticeText: { fontSize: fontSizes.sm, color: colors.error },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.base,
    gap: spacing.xs,
  },
  item: { minHeight: minTapTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  itemPressed: { backgroundColor: colors.surface },
  itemText: { fontSize: fontSizes.base, color: colors.text },
  itemDanger: { color: colors.error },
});
