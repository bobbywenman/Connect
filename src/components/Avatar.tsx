import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, networkColors } from '@/constants';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export const avatarSizes: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 64, xl: 96 };

export interface AvatarProps {
  firstName: string;
  lastName?: string;
  photoUrl?: string | null;
  size?: AvatarSize;
}

export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.trim().charAt(0);
  const last = (lastName ?? '').trim().charAt(0);
  return (first + last).toUpperCase() || '?';
}

/** Deterministic background color from a name (same name, same color). */
export function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return networkColors[hash % networkColors.length]!.value;
}

export function Avatar({ firstName, lastName, photoUrl, size = 'md' }: AvatarProps) {
  const dimension = avatarSizes[size];
  const fullName = `${firstName} ${lastName ?? ''}`.trim();
  const box = { width: dimension, height: dimension, borderRadius: dimension / 2 };
  if (photoUrl) {
    return (
      <Image
        accessibilityRole="image"
        accessibilityLabel={`Photo of ${fullName}`}
        source={{ uri: photoUrl }}
        style={[styles.image, box]}
      />
    );
  }
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={fullName}
      style={[styles.fallback, box, { backgroundColor: avatarColor(fullName) }]}
    >
      <Text
        importantForAccessibility="no"
        style={[styles.initials, { fontSize: dimension * 0.4 }]}
        maxFontSizeMultiplier={1.2}
      >
        {getInitials(firstName, lastName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.textOnPrimary, fontWeight: fontWeights.bold },
});
