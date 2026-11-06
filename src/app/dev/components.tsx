import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  Badge,
  BrandTitle,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  TextField,
} from '@/components';
import { colors, fontSizes, fontWeights, networkColors, radii, spacing } from '@/constants';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Dev-only gallery of every design-system component in its states. */
export default function ComponentGallery() {
  const [chips, setChips] = useState(['golf', 'book club', 'neighbour']);
  const [name, setName] = useState('');

  return (
    <Screen scroll>
      <BrandTitle subtitle="Component gallery" />

      <Section title="Colors">
        <View style={styles.swatches}>
          {Object.entries(colors).map(([key, value]) => (
            <View key={key} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: value }]} />
              <Text style={styles.caption}>{key}</Text>
            </View>
          ))}
        </View>
        <View style={styles.swatches}>
          {networkColors.map((c) => (
            <View key={c.name} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: c.value }]} />
              <Text style={styles.caption}>{c.name}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Button">
        <Button label="Primary" onPress={() => {}} />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Delete" variant="danger" onPress={() => {}} />
        <Button label="Loading" isLoading onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
        <View style={styles.row}>
          <Button label="Small" size="sm" onPress={() => {}} />
          <Button label="Medium" size="md" onPress={() => {}} />
          <Button label="Large" size="lg" onPress={() => {}} />
        </View>
      </Section>

      <Section title="TextField">
        <TextField label="Name" placeholder="Ada Lovelace" value={name} onChangeText={setName} />
        <TextField label="Email" value="not-an-email" error="Enter a valid email address" />
        <TextField label="Password" secureTextEntry value="secret" />
        <TextField label="Notes" multiline placeholder="Things to remember" />
      </Section>

      <Section title="Avatar">
        <View style={styles.row}>
          <Avatar firstName="Ada" lastName="Lovelace" size="sm" />
          <Avatar firstName="Grace" lastName="Hopper" size="md" />
          <Avatar firstName="Alan" lastName="Turing" size="lg" />
          <Avatar firstName="Katherine" lastName="Johnson" size="xl" />
        </View>
      </Section>

      <Section title="Card">
        <Card>
          <Text style={styles.body}>A static card</Text>
        </Card>
        <Card onPress={() => {}} accessibilityLabel="Pressable card">
          <Text style={styles.body}>A pressable card</Text>
        </Card>
      </Section>

      <Section title="Badge">
        <View style={styles.row}>
          <Badge label="Family" />
          {networkColors.slice(0, 4).map((c) => (
            <Badge key={c.name} label={c.name} color={c.value} />
          ))}
          <Badge label="Sort of" color={colors.warning} />
          <Badge label="Knew it" color={colors.success} />
        </View>
      </Section>

      <Section title="Chip">
        <View style={styles.row}>
          {chips.map((c) => (
            <Chip key={c} label={c} onRemove={() => setChips(chips.filter((x) => x !== c))} />
          ))}
          <Chip label="read-only" />
        </View>
      </Section>

      <Section title="EmptyState">
        <Card>
          <EmptyState
            icon={<Text style={styles.icon}>👥</Text>}
            title="No people yet"
            subtitle="Add the people in your life to start remembering them."
            ctaLabel="Add person"
            onCtaPress={() => {}}
          />
        </Card>
        <Card>
          <EmptyState title="Nothing to review" subtitle="Come back after studying." />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.lg },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatchItem: { alignItems: 'center', width: 80 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caption: { fontSize: fontSizes.xs, color: colors.textSecondary },
  body: { fontSize: fontSizes.base, color: colors.text },
  icon: { fontSize: fontSizes['2xl'] },
});
