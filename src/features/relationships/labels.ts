/** Pure helpers for building and describing relationship rows (KT-19). */
import {
  CATEGORY_LABELS,
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_TYPES,
  type RelationshipCategory,
  type RelationshipType,
  type RelationshipTypeId,
} from './types';

/** The columns of a relationships row that this module reads and writes. */
export interface RelationshipRow {
  source_person_id: string;
  target_person_id: string;
  /** What the source is to the target. */
  type: RelationshipTypeId;
  /** What the target is to the source. */
  inverse_type: RelationshipTypeId;
  /** Custom only: what the source is to the target. */
  custom_label: string | null;
  /** Custom only: what the target is to the source. */
  inverse_custom_label: string | null;
}

/** Name fields used for display. */
export interface PersonName {
  first_name: string;
  preferred_name?: string | null;
}

/** Looks up a person's name by id; undefined when unknown. */
export type NameLookup = (personId: string) => PersonName | undefined;

export interface CustomLabels {
  label: string;
  inverseLabel?: string;
}

/** Matches the database checks on custom_label and inverse_custom_label. */
export const MAX_CUSTOM_LABEL_LENGTH = 50;

const TYPES_BY_ID: ReadonlyMap<string, RelationshipType> = new Map(
  RELATIONSHIP_TYPES.map((type) => [type.id, type]),
);

/** Returns the catalog entry for an id, or undefined if the id is unknown. */
export function getRelationshipType(id: string): RelationshipType | undefined {
  return TYPES_BY_ID.get(id);
}

function requireType(id: string): RelationshipType {
  const found = TYPES_BY_ID.get(id);
  if (!found) throw new Error(`Unknown relationship type: ${id}`);
  return found;
}

/** Returns every relationship type in picker order. */
export function listRelationshipTypes(): readonly RelationshipType[] {
  return RELATIONSHIP_TYPES;
}

/** Returns the types grouped by category, in picker order. */
export function listByCategory(): {
  category: RelationshipCategory;
  label: string;
  types: RelationshipType[];
}[] {
  return RELATIONSHIP_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    types: RELATIONSHIP_TYPES.filter((type) => type.category === category),
  }));
}

/** True when both people see the same type (sibling, friend, ...). */
export function isSymmetric(id: string): boolean {
  return requireType(id).inverse === id;
}

/** Returns what the other person is to you, given what you are to them. */
export function inverseOf(id: string): RelationshipTypeId {
  return requireType(id).inverse;
}

function cleanLabel(raw: string): string {
  const label = raw.trim();
  if (label.length === 0) throw new Error('Custom label cannot be empty');
  if (label.length > MAX_CUSTOM_LABEL_LENGTH) {
    throw new Error(`Custom label must be ${MAX_CUSTOM_LABEL_LENGTH} characters or fewer`);
  }
  return label;
}

/**
 * Builds the row to insert for "source is `typeId` to target".
 * Custom types require `custom`; the inverse label defaults to the label.
 */
export function buildRelationship(
  sourceId: string,
  targetId: string,
  typeId: RelationshipTypeId,
  custom?: CustomLabels,
): RelationshipRow {
  if (sourceId === targetId) throw new Error('A person cannot be related to themselves');
  const type = requireType(typeId);
  if (type.id === 'custom') {
    if (!custom) throw new Error('Custom relationships need a label');
    const label = cleanLabel(custom.label);
    return {
      source_person_id: sourceId,
      target_person_id: targetId,
      type: 'custom',
      inverse_type: 'custom',
      custom_label: label,
      inverse_custom_label:
        custom.inverseLabel === undefined ? label : cleanLabel(custom.inverseLabel),
    };
  }
  return {
    source_person_id: sourceId,
    target_person_id: targetId,
    type: type.id,
    inverse_type: type.inverse,
    custom_label: null,
    inverse_custom_label: null,
  };
}

export interface RelationshipView {
  /** What the viewer is to the other person. */
  type: RelationshipTypeId;
  otherPersonId: string;
  /** Custom wording from the viewer's side; present only for custom types. */
  customLabel?: string;
}

/** Returns which type applies from the viewer's side and who the other person is. */
export function describeFrom(
  relationship: RelationshipRow,
  viewerPersonId: string,
): RelationshipView {
  const isSource = relationship.source_person_id === viewerPersonId;
  if (!isSource && relationship.target_person_id !== viewerPersonId) {
    throw new Error('Viewer is not part of this relationship');
  }
  const type = isSource ? relationship.type : relationship.inverse_type;
  const view: RelationshipView = {
    type,
    otherPersonId: isSource ? relationship.target_person_id : relationship.source_person_id,
  };
  if (type === 'custom') {
    const stored = isSource ? relationship.custom_label : relationship.inverse_custom_label;
    // A missing label falls back to the catalog label ("Custom") when displayed.
    if (stored) view.customLabel = stored;
  }
  return view;
}

/** Display name: preferred name if set, else first name, else "Someone". */
export function displayName(person: PersonName | undefined): string {
  return person?.preferred_name?.trim() || person?.first_name.trim() || 'Someone';
}

function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function labelFor(view: RelationshipView): string {
  return view.customLabel ?? requireType(view.type).label;
}

/** e.g. "Cousin of Maria": what the viewer is to the other person. */
export function badgeLabel(
  relationship: RelationshipRow,
  viewerPersonId: string,
  names: NameLookup,
): string {
  const view = describeFrom(relationship, viewerPersonId);
  return `${capitalize(labelFor(view))} of ${displayName(names(view.otherPersonId))}`;
}

/** e.g. "Sarah is Maria's cousin", with the viewer as the subject. */
export function sentence(
  relationship: RelationshipRow,
  viewerPersonId: string,
  names: NameLookup,
): string {
  const view = describeFrom(relationship, viewerPersonId);
  const viewer = displayName(names(viewerPersonId));
  const other = possessive(displayName(names(view.otherPersonId)));
  return `${viewer} is ${other} ${lowerFirst(labelFor(view))}`;
}

/**
 * e.g. "Your cousin": what the other person is to the self person.
 * Returns null when the self person is not part of the relationship.
 */
export function relationToMe(relationship: RelationshipRow, selfPersonId: string): string | null {
  if (
    relationship.source_person_id !== selfPersonId &&
    relationship.target_person_id !== selfPersonId
  ) {
    return null;
  }
  const self = describeFrom(relationship, selfPersonId);
  const other = describeFrom(relationship, self.otherPersonId);
  return `Your ${lowerFirst(labelFor(other))}`;
}

/** True if the same unordered pair already has this relationship, in either direction. */
export function isDuplicate(
  existingRows: readonly RelationshipRow[],
  candidate: RelationshipRow,
): boolean {
  const key = (row: RelationshipRow) => {
    const view = describeFrom(row, candidate.source_person_id);
    return `${view.type}:${(view.customLabel ?? '').toLowerCase()}`;
  };
  const candidateKey = key(candidate);
  return existingRows.some((row) => {
    const samePair =
      (row.source_person_id === candidate.source_person_id &&
        row.target_person_id === candidate.target_person_id) ||
      (row.source_person_id === candidate.target_person_id &&
        row.target_person_id === candidate.source_person_id);
    return samePair && key(row) === candidateKey;
  });
}
