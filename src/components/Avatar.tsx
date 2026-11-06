import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, networkColors } from '@/constants';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export const avatarSizes: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 64, xl: 96 };

export interface AvatarProps {
  firstName: string;
  lastName?: string;
  photoUrl?: string | null;
  /**
   * Stable disk-cache key for the photo. Signed URLs change every time they are issued, so
   * pass something like `${photo_path}?v=${updated_at}` to avoid re-downloading the same image.
   */
  photoCacheKey?: string;
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

export function Avatar({ firstName, lastName, photoUrl, photoCacheKey, size = 'md' }: AvatarProps) {
  // The URL that failed to load, so a new URL gets a fresh try; initials show meanwhile.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const dimension = avatarSizes[size];
  const fullName = `${firstName} ${lastName ?? ''}`.trim();
  const box = { width: dimension, height: dimension, borderRadius: dimension / 2 };
  if (photoUrl && photoUrl !== failedUrl) {
    return (
      <Image
        accessibilityRole="image"
        accessibilityLabel={`Photo of ${fullName}`}
        source={{ uri: photoUrl, cacheKey: photoCacheKey }}
        contentFit="cover"
        transition={150}
        onError={() => setFailedUrl(photoUrl)}
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
