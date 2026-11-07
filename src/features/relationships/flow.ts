/** Pure helpers for the add / change relationship flow (KT-20, KT-21). No I/O. */
import {
  buildRelationship,
  displayName,
  type CustomLabels,
  type PersonName,
  type RelationshipRow,
} from './labels';
import type { RelationshipTypeId } from './types';

function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

/**
 * Step 2 heading, phrased from the first person's side so the options are unambiguous:
 * "Sarah is Maria's…" followed by "Parent", "Child", ...
 */
export function typeQuestion(from: PersonName, to: PersonName): string {
  return `${displayName(from)} is ${possessive(displayName(to))}…`;
}

/** Prompt for the optional custom inverse: "and Maria is Sarah's…". */
export function inverseQuestion(from: PersonName, to: PersonName): string {
  return `and ${displayName(to)} is ${possessive(displayName(from))}…`;
}

/** What the person picked in step 2. `custom` is set only for the custom type. */
export interface TypeChoice {
  typeId: RelationshipTypeId;
  custom?: { label: string; inverseLabel?: string };
}

/** The editable columns of a stored relationship. */
export type RelationshipFields = Pick<
  RelationshipRow,
  'type' | 'inverse_type' | 'custom_label' | 'inverse_custom_label'
>;

/**
 * The row to insert for "`fromId` is <choice> to `toId`". The from person is the source.
 * Blank inverse text means "the same word for both sides".
 */
export function rowFromChoice(fromId: string, toId: string, choice: TypeChoice): RelationshipRow {
  const custom: CustomLabels | undefined = choice.custom && {
    label: choice.custom.label,
    inverseLabel: choice.custom.inverseLabel?.trim() ? choice.custom.inverseLabel : undefined,
  };
  return buildRelationship(fromId, toId, choice.typeId, custom);
}

/**
 * Columns to write when `viewerId` changes an existing relationship to `choice`, where the
 * choice is worded from the viewer's side ("viewer is <choice> to the other person").
 * The stored row keeps its source and target (so the id, and the database's unique key,
 * stay stable). If the viewer is the target, the two sides are swapped before writing.
 */
export function fieldsForEdit(
  existing: Pick<RelationshipRow, 'source_person_id' | 'target_person_id'>,
  viewerId: string,
  choice: TypeChoice,
): RelationshipFields {
  const viewerIsSource = existing.source_person_id === viewerId;
  if (!viewerIsSource && existing.target_person_id !== viewerId) {
    throw new Error('Viewer is not part of this relationship');
  }
  const otherId = viewerIsSource ? existing.target_person_id : existing.source_person_id;
  const built = rowFromChoice(viewerId, otherId, choice);
  return viewerIsSource
    ? {
        type: built.type,
        inverse_type: built.inverse_type,
        custom_label: built.custom_label,
        inverse_custom_label: built.inverse_custom_label,
      }
    : {
        type: built.inverse_type,
        inverse_type: built.type,
        custom_label: built.inverse_custom_label,
        inverse_custom_label: built.custom_label,
      };
}
