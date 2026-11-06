import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components';
import { colors, fontSizes, fontWeights, minTapTarget, spacing } from '@/constants';
import { useNetworks } from '@/features/networks/hooks';
import type { PersonDetail } from '@/features/people/api';
import { usePersonDetail } from '@/features/people/hooks';
import { usePhotoUrls } from '@/features/people/photoHooks';

import type { PickablePerson } from '../api';
import { fieldsForEdit, rowFromChoice, type TypeChoice } from '../flow';
import {
  useCreateRelationship,
  useCustomRelationshipTypes,
  usePickablePeople,
  useSaveCustomRelationshipType,
  useUpdateRelationship,
} from '../hooks';
import {
  describeFrom,
  duplicateSentence,
  isDuplicate,
  sentence,
  type NameLookup,
  type RelationshipRow,
} from '../labels';
import { PickPersonStep } from './PickPersonStep';
import { PickTypeStep } from './PickTypeStep';
import { ReviewStep } from './ReviewStep';
import { StepIndicator } from './StepIndicator';

export interface RelationshipFlowProps {
  /** The "from" person: the flow words everything from their side. */
  personId: string;
  /** Skips step 1 when set. */
  targetId?: string;
  /** Set to change an existing relationship of `personId`: starts at step 2, pair fixed. */
  relationshipId?: string;
}

type Step = 1 | 2 | 3;
type FlowPerson = Pick<
  PickablePerson,
  'id' | 'first_name' | 'last_name' | 'preferred_name' | 'photo_path' | 'updated_at' | 'is_self'
>;

/** Add (or change) a relationship in three steps: person, type, review. */
export function RelationshipFlow({ personId, targetId, relationshipId }: RelationshipFlowProps) {
  const detail = usePersonDetail(personId);
  const people = usePickablePeople();
  if (detail.isPending || (!relationshipId && people.isPending)) {
    return <Centered testID="relationship-loading" text="Loading…" />;
  }
  if (detail.isError || people.isError || !detail.data) {
    return (
      <Centered>
        <EmptyState
          title="Couldn't load this"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCtaPress={() => {
            void detail.refetch();
            void people.refetch();
          }}
        />
      </Centered>
    );
  }
  const existing = relationshipId
    ? detail.data.connections.find((c) => c.relationship.id === relationshipId)
    : undefined;
  if (relationshipId && !existing) {
    return (
      <Centered>
        <EmptyState title="Relationship not found" subtitle="It may have been removed." />
      </Centered>
    );
  }
  const preset: FlowPerson | undefined = existing
    ? existing.person
    : people.data?.find((p) => p.id === targetId);
  return (
    <FlowSteps
      detail={detail.data}
      people={people.data ?? []}
      preset={preset}
      existing={existing?.relationship}
    />
  );
}

function FlowSteps({
  detail,
  people,
  preset,
  existing,
}: {
  detail: PersonDetail;
  people: readonly PickablePerson[];
  preset: FlowPerson | undefined;
  existing: (RelationshipRow & { id: string }) | undefined;
}) {
  const router = useRouter();
  const { person: from, connections } = detail;
  const [picked, setPicked] = useState<FlowPerson | null>(null);
  const target = picked ?? preset ?? null;
  const firstStep: Step = preset ? 2 : 1;
  const [step, setStep] = useState<Step>(firstStep);
  const [choice, setChoice] = useState<TypeChoice | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const networks = useNetworks();
  const customTypes = useCustomRelationshipTypes();
  const { data: photoUrls } = usePhotoUrls(people.map((p) => p.photo_path));
  const create = useCreateRelationship();
  const update = useUpdateRelationship();
  const saveCustom = useSaveCustomRelationshipType();

  const fromNetworkIds = useMemo(
    () => (from.is_self ? null : new Set(detail.networks.map((n) => n.id))),
    [from.is_self, detail.networks],
  );

  const close = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/person/[id]', params: { id: from.id } });

  const initialChoice = existing ? choiceFromRow(existing, from.id) : undefined;
  const activeChoice = choice ?? initialChoice ?? null;

  // The row as it will be stored, for the review text and the duplicate check.
  const finalRow = useMemo<RelationshipRow | null>(() => {
    if (!target || !choice) return null;
    try {
      if (existing) {
        return { ...existing, ...fieldsForEdit(existing, from.id, choice) };
      }
      return rowFromChoice(from.id, target.id, choice);
    } catch {
      return null;
    }
  }, [target, choice, existing, from.id]);

  const names: NameLookup = (id) =>
    id === from.id ? from : id === target?.id ? (target ?? undefined) : undefined;

  const duplicate =
    finalRow && target
      ? isDuplicate(
          connections
            .filter((c) => c.person.id === target.id && c.relationship.id !== existing?.id)
            .map((c) => c.relationship),
          finalRow,
        )
      : false;
  const blockedMessage = duplicate && finalRow ? duplicateSentence(finalRow, from.id, names) : null;

  const back = () => {
    setSaveError(null);
    if (step > firstStep) setStep((step - 1) as Step);
    else close();
  };

  const choose = (next: TypeChoice) => {
    setChoice(next);
    setSaveError(null);
    setStep(3);
  };

  const save = async () => {
    if (!finalRow || !target || !choice) return;
    setSaveError(null);
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, row: finalRow });
      } else {
        await create.mutateAsync(finalRow);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
      return;
    }
    // Remembering the custom label is a convenience; never let it block or fail the save.
    if (choice.custom) {
      saveCustom
        .mutateAsync({
          label: choice.custom.label,
          inverseLabel: choice.custom.inverseLabel?.trim() || choice.custom.label,
        })
        .catch(() => undefined);
    }
    close();
  };

  let body;
  if (step === 1 || !target) {
    body = (
      <PickPersonStep
        people={people}
        from={from}
        fromNetworkIds={fromNetworkIds}
        networks={networks.data ?? []}
        photoUrls={photoUrls}
        onPick={(p) => {
          setPicked(p);
          setStep(2);
        }}
      />
    );
  } else if (step === 2) {
    body = (
      <PickTypeStep
        key={target.id}
        from={from}
        to={target}
        initial={activeChoice ?? undefined}
        savedCustom={customTypes.data ?? []}
        onChoose={choose}
      />
    );
  } else {
    body = (
      <ReviewStep
        sentence={finalRow ? sentence(finalRow, from.id, names) : ''}
        inverseSentence={finalRow ? sentence(finalRow, target.id, names) : ''}
        error={blockedMessage ?? saveError}
        blocked={!!blockedMessage || !finalRow}
        isSaving={create.isPending || update.isPending}
        saveLabel={existing ? 'Save changes' : 'Save'}
        onSave={() => void save()}
      />
    );
  }

  const shownStep: Step = target ? step : 1;
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: existing ? 'Change relationship' : 'New relationship' }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step > firstStep ? 'Back' : 'Cancel'}
          onPress={back}
          style={styles.back}
        >
          <Text style={styles.backText}>{step > firstStep ? '‹ Back' : 'Cancel'}</Text>
        </Pressable>
        <View style={styles.indicator}>
          <StepIndicator step={shownStep} />
        </View>
      </View>
      <View style={styles.body}>{body}</View>
    </View>
  );
}

/** What the viewer currently is to the other person, as a step-2 choice. */
function choiceFromRow(row: RelationshipRow, viewerId: string): TypeChoice {
  const view = describeFrom(row, viewerId);
  if (view.type !== 'custom') return { typeId: view.type };
  const other = describeFrom(row, view.otherPersonId);
  const label = view.customLabel ?? 'Custom';
  return {
    typeId: 'custom',
    custom: {
      label,
      inverseLabel:
        other.customLabel && other.customLabel !== label ? other.customLabel : undefined,
    },
  };
}

function Centered({
  children,
  text,
  testID,
}: {
  children?: React.ReactNode;
  text?: string;
  testID?: string;
}) {
  return (
    <View style={styles.centered} testID={testID}>
      {text ? <Text style={styles.centeredText}>{text}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  back: { minHeight: minTapTarget, minWidth: minTapTarget, justifyContent: 'center' },
  backText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.accent },
  indicator: { flex: 1 },
  body: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  centeredText: { fontSize: fontSizes.base, color: colors.textSecondary },
});
