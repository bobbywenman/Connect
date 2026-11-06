import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, TextField } from '@/components';
import { spacing } from '@/constants';

import { normalizeTags, TAG_MAX } from '../schemas';

export interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Chip input: typing a comma or pressing return/done turns the text into a chip.
 * Duplicates (ignoring case) and empty entries are dropped; chips are removable.
 */
export function TagInput({ label, tags, onChange }: TagInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();

  /** Add every complete entry in `entries`; returns false if one was too long. */
  const commit = (entries: string[]) => {
    const clean = entries.map((e) => e.trim()).filter(Boolean);
    if (clean.some((e) => e.length > TAG_MAX)) {
      setError(`Tags must be ${TAG_MAX} characters or fewer`);
      return false;
    }
    setError(undefined);
    if (clean.length > 0) onChange(normalizeTags([...tags, ...clean]));
    return true;
  };

  const onChangeText = (next: string) => {
    if (!next.includes(',')) {
      setText(next);
      if (error) setError(undefined);
      return;
    }
    const parts = next.split(',');
    const pending = parts.pop() ?? '';
    if (commit(parts)) setText(pending);
    else setText(next);
  };

  const flush = () => {
    if (commit([text])) setText('');
  };

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        value={text}
        onChangeText={onChangeText}
        onSubmitEditing={flush}
        onBlur={flush}
        returnKeyType="done"
        placeholder="Type a tag, then comma or return"
        autoCapitalize="none"
        error={error}
      />
      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <Chip
              key={tag.toLowerCase()}
              label={tag}
              onRemove={() => onChange(tags.filter((t) => t !== tag))}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
