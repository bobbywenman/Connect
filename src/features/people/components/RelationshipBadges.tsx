import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionSheet, Badge, ConfirmDialog } from '@/components';
import { colors, fontSizes, minTapTarget, spacing } from '@/constants';
import { useDeleteRelationship } from '@/features/relationships';

import type { Person, PersonConnection } from '../api';
import { relationshipBadges } from '../detail';

export interface RelationshipBadgesProps {
  person: Pick<Person, 'id' | 'is_self'>;
  connections: readonly PersonConnection[];
}

/**
 * The row of relationship badges ("Cousin of Maria"). Tapping one opens a menu to change
 * or remove that relationship (KT-21).
 */
export function RelationshipBadges({ person, connections }: RelationshipBadgesProps) {
  const router = useRouter();
  const remove = useDeleteRelationship();
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const badges = relationshipBadges(person, connections);
  if (badges.length === 0) return null;

  const closeAll = () => {
    setMenuOpen(false);
    setConfirmOpen(false);
  };
  /** iOS cannot present a modal while another is still dismissing, so wait there. */
  const afterMenuCloses = (next: () => void) => {
    setMenuOpen(false);
    setTimeout(next, Platform.OS === 'ios' ? 400 : 0);
  };
  const change = () => {
    const id = selected?.id;
    if (!id) return;
    afterMenuCloses(() =>
      router.push({
        pathname: '/relationship/[id]/edit',
        params: { id, personId: person.id },
      }),
    );
  };
  const doRemove = async () => {
    const id = selected?.id;
    closeAll();
    if (!id) return;
    setError(null);
    try {
      await remove.mutateAsync(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the relationship.");
    }
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badges}
        style={styles.scroll}
      >
        {badges.map((b) => (
          <BadgeButton
            key={b.id}
            label={b.label}
            onPress={() => {
              setSelected(b);
              setError(null);
              setMenuOpen(true);
            }}
          />
        ))}
      </ScrollView>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={selected?.label}
        actions={[
          { label: 'Change relationship', onPress: change },
          {
            label: 'Remove',
            destructive: true,
            onPress: () =>
              afterMenuCloses(() => {
                setConfirmOpen(true);
              }),
          },
        ]}
      />
      <ConfirmDialog
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void doRemove()}
        confirmLabel="Remove"
        destructive
        title={`Remove '${selected?.label ?? ''}'?`}
        message="This removes the relationship from both people's profiles. The people themselves stay."
      />
    </View>
  );
}

function BadgeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens options to change or remove this relationship"
      onPress={onPress}
      style={({ pressed }) => [styles.badgeButton, pressed && styles.pressed]}
    >
      <Badge label={label} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginHorizontal: -spacing.base },
  badges: { gap: spacing.sm, paddingHorizontal: spacing.base },
  badgeButton: { minHeight: minTapTarget, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  error: { fontSize: fontSizes.sm, color: colors.error },
});
