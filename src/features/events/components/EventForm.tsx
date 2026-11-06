import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, TextField } from '@/components';
import { colors, fontSizes, fontWeights, spacing } from '@/constants';
import type { NetworkSummary } from '@/features/networks/api';
import { DateField } from '@/features/people/components/DateField';
import { confirmDiscard } from '@/features/people/confirmDiscard';

import {
  EVENT_DESCRIPTION_MAX,
  eventFormSchema,
  type EventFormInput,
  type EventFormValues,
} from '../schemas';
import { EventNetworkPicker } from './EventNetworkPicker';

export interface EventFormProps {
  /** Screen title shown in the header bar, e.g. "New event". */
  title: string;
  initialValues: EventFormInput;
  networks: NetworkSummary[];
  isSaving?: boolean;
  /** Message from a failed save, shown above the fields. */
  submitError?: string | null;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  onCancel: () => void;
}

/** Create/edit event form: name and date are required; everything else is optional. */
export function EventForm({
  title,
  initialValues,
  networks,
  isSaving = false,
  submitError,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EventFormInput, unknown, EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
  });

  const save = handleSubmit((values) => onSubmit(values));
  const cancel = async () => {
    if (!isDirty || (await confirmDiscard())) onCancel();
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.headerBar}>
        <Button label="Cancel" variant="ghost" onPress={() => void cancel()} />
        <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Button label="Save" isLoading={isSaving} onPress={() => void save()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {submitError ? (
          <Text accessibilityRole="alert" style={styles.submitError}>
            {submitError}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label="Name *"
              placeholder="Sarah's wedding"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="words"
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="eventDate"
          render={({ field }) => (
            <DateField
              label="Date *"
              value={field.value}
              onChange={field.onChange}
              error={errors.eventDate?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <TextField
              label="Location"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="words"
              error={errors.location?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextField
              label="Description"
              placeholder={`Up to ${EVENT_DESCRIPTION_MAX} characters`}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              error={errors.description?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="networkId"
          render={({ field }) => (
            <EventNetworkPicker networks={networks} value={field.value} onChange={field.onChange} />
          )}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  scroll: { flex: 1 },
  fields: { gap: spacing.base, paddingBottom: spacing.xl },
  submitError: { color: colors.error, fontSize: fontSizes.sm },
});
