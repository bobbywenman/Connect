import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldPath,
} from 'react-hook-form';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Screen, TextField } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, spacing } from '@/constants';
import type { NetworkSummary } from '@/features/networks/api';

import { confirmDiscard } from '../confirmDiscard';
import { NO_PHOTO_CHANGE, type PhotoChange } from '../photos';
import { createPersonFormSchema, type PersonFormInput, type PersonFormValues } from '../schemas';
import { DateField } from './DateField';
import { FormSection } from './FormSection';
import { NetworkPicker } from './NetworkPicker';
import { PhotoPicker } from './PhotoPicker';
import { TagInput } from './TagInput';

type SectionKey = 'personal' | 'location' | 'work' | 'notes';

const SECTION_FIELDS: Record<SectionKey, (keyof PersonFormInput)[]> = {
  personal: ['pronouns', 'birthdate', 'birthdayReminder', 'anniversaryDate', 'anniversaryReminder'],
  location: ['locationCity'],
  work: ['jobTitle', 'company', 'department'],
  notes: ['notes', 'tags', 'funFacts', 'conversationStarters'],
};

const SECTION_TITLES: Record<SectionKey, string> = {
  personal: 'Personal',
  location: 'Location',
  work: 'Work',
  notes: 'Notes & tags',
};

const SECTION_ORDER: SectionKey[] = ['personal', 'location', 'work', 'notes'];

function hasValue(value: PersonFormInput[keyof PersonFormInput]): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value === true;
}

type TextFieldName = {
  [K in keyof PersonFormInput]: PersonFormInput[K] extends string ? K : never;
}[keyof PersonFormInput];

interface FormTextProps {
  control: Control<PersonFormInput, unknown, PersonFormValues>;
  name: TextFieldName;
  label: string;
  errors: FieldErrors<PersonFormInput>;
  multiline?: boolean;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

function FormText({ control, name, label, errors, ...rest }: FormTextProps) {
  return (
    <Controller
      control={control}
      name={name as FieldPath<PersonFormInput>}
      render={({ field }) => (
        <TextField
          {...rest}
          label={label}
          value={field.value as string}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={errors[name]?.message}
        />
      )}
    />
  );
}

export interface PersonFormProps {
  /** Screen title shown in the header bar, e.g. "New person". */
  title: string;
  initialValues: PersonFormInput;
  networks: NetworkSummary[];
  /** The self person: no network picker (they are in every network, D-2). */
  isSelf?: boolean;
  isSaving?: boolean;
  /** Message from a failed save, shown above the fields. */
  submitError?: string | null;
  /** Signed URL and cache key of the saved photo (edit only). */
  photoUrl?: string | null;
  photoCacheKey?: string;
  hasPhoto?: boolean;
  /** `photo` says what to do with the photo once the person row is saved. */
  onSubmit: (values: PersonFormValues, photo: PhotoChange) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Add/edit person form, shared by create, edit and (later) onboarding. Only first name is
 * required (plus one network, except for the self person). Optional fields live in
 * collapsible sections; sections that already hold data start open, and a section with a
 * validation error opens on save.
 */
export function PersonForm({
  title,
  initialValues,
  networks,
  isSelf = false,
  isSaving = false,
  submitError,
  photoUrl,
  photoCacheKey,
  hasPhoto = false,
  onSubmit,
  onCancel,
}: PersonFormProps) {
  const schema = useMemo(() => createPersonFormSchema({ isSelf }), [isSelf]);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PersonFormInput, unknown, PersonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const [photo, setPhoto] = useState<PhotoChange>(NO_PHOTO_CHANGE);

  const [open, setOpen] = useState<Record<SectionKey, boolean>>(() => {
    const initial = {} as Record<SectionKey, boolean>;
    for (const key of SECTION_ORDER) {
      initial[key] = SECTION_FIELDS[key].some((f) => hasValue(initialValues[f]));
    }
    return initial;
  });
  const toggle = (key: SectionKey) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const firstName = useWatch({ control, name: 'firstName' });
  const lastName = useWatch({ control, name: 'lastName' });
  const birthdate = useWatch({ control, name: 'birthdate' });
  const anniversaryDate = useWatch({ control, name: 'anniversaryDate' });

  const save = handleSubmit(
    (values) => onSubmit(values, photo),
    (invalid) => {
      // Reveal any collapsed section that holds an error.
      setOpen((o) => {
        const next = { ...o };
        for (const key of SECTION_ORDER) {
          if (SECTION_FIELDS[key].some((f) => invalid[f])) next[key] = true;
        }
        return next;
      });
    },
  );

  const cancel = async () => {
    if ((!isDirty && photo.kind === 'unchanged') || (await confirmDiscard())) onCancel();
  };

  const reminderRow = (
    name: 'birthdayReminder' | 'anniversaryReminder',
    label: string,
    hasDate: boolean,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, !hasDate && styles.switchLabelOff]}>Remind me</Text>
          <Switch
            accessibilityLabel={label}
            value={hasDate && field.value}
            disabled={!hasDate}
            accessibilityState={{ disabled: !hasDate }}
            onValueChange={field.onChange}
          />
        </View>
      )}
    />
  );

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

        <FormSection title="Basic" expanded collapsible={false} onToggle={() => {}}>
          <PhotoPicker
            firstName={firstName}
            lastName={lastName}
            savedUrl={photoUrl}
            savedCacheKey={photoCacheKey}
            hasSavedPhoto={hasPhoto}
            change={photo}
            onChange={setPhoto}
          />
          <FormText
            control={control}
            name="firstName"
            label="First name *"
            errors={errors}
            autoCapitalize="words"
          />
          <FormText
            control={control}
            name="lastName"
            label="Last name"
            errors={errors}
            autoCapitalize="words"
          />
          <FormText
            control={control}
            name="preferredName"
            label="Nickname"
            errors={errors}
            autoCapitalize="words"
          />
          {isSelf ? null : (
            <Controller
              control={control}
              name="networkIds"
              render={({ field }) => (
                <NetworkPicker
                  networks={networks}
                  selectedIds={field.value}
                  onChange={field.onChange}
                  error={errors.networkIds?.message}
                />
              )}
            />
          )}
        </FormSection>

        <FormSection
          title={SECTION_TITLES.personal}
          expanded={open.personal}
          onToggle={() => toggle('personal')}
        >
          <FormText control={control} name="pronouns" label="Pronouns" errors={errors} />
          <Controller
            control={control}
            name="birthdate"
            render={({ field }) => (
              <DateField
                label="Birthday"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  if (!v) setValue('birthdayReminder', false);
                }}
                error={errors.birthdate?.message}
              />
            )}
          />
          {reminderRow('birthdayReminder', 'Remind me about this birthday', !!birthdate)}
          <Controller
            control={control}
            name="anniversaryDate"
            render={({ field }) => (
              <DateField
                label="Anniversary"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  if (!v) setValue('anniversaryReminder', false);
                }}
                error={errors.anniversaryDate?.message}
              />
            )}
          />
          {reminderRow(
            'anniversaryReminder',
            'Remind me about this anniversary',
            !!anniversaryDate,
          )}
        </FormSection>

        <FormSection
          title={SECTION_TITLES.location}
          expanded={open.location}
          onToggle={() => toggle('location')}
        >
          <FormText
            control={control}
            name="locationCity"
            label="City"
            errors={errors}
            autoCapitalize="words"
          />
        </FormSection>

        <FormSection
          title={SECTION_TITLES.work}
          expanded={open.work}
          onToggle={() => toggle('work')}
        >
          <FormText
            control={control}
            name="jobTitle"
            label="Job title"
            errors={errors}
            autoCapitalize="words"
          />
          <FormText
            control={control}
            name="company"
            label="Company"
            errors={errors}
            autoCapitalize="words"
          />
          <FormText
            control={control}
            name="department"
            label="Department"
            errors={errors}
            autoCapitalize="words"
          />
        </FormSection>

        <FormSection
          title={SECTION_TITLES.notes}
          expanded={open.notes}
          onToggle={() => toggle('notes')}
        >
          <FormText control={control} name="notes" label="Notes" errors={errors} multiline />
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput label="Groups & tags" tags={field.value} onChange={field.onChange} />
            )}
          />
          <FormText control={control} name="funFacts" label="Fun facts" errors={errors} multiline />
          <FormText
            control={control}
            name="conversationStarters"
            label="Conversation starters"
            errors={errors}
            multiline
          />
        </FormSection>
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
  switchRow: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: fontSizes.base, color: colors.text },
  switchLabelOff: { color: colors.textSecondary },
});
