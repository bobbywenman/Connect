/** Relationship type catalog (KT-19). Pure data; no I/O. */

export const RELATIONSHIP_CATEGORIES = ['family', 'professional', 'social', 'other'] as const;
export type RelationshipCategory = (typeof RELATIONSHIP_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<RelationshipCategory, string> = {
  family: 'Family',
  professional: 'Professional',
  social: 'Social',
  other: 'Other',
};

export type RelationshipTypeId =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'grandparent'
  | 'grandchild'
  | 'aunt_uncle'
  | 'niece_nephew'
  | 'cousin'
  | 'in_law'
  | 'manager'
  | 'direct_report'
  | 'mentor'
  | 'mentee'
  | 'coworker'
  | 'client'
  | 'provider'
  | 'friend'
  | 'acquaintance'
  | 'neighbor'
  | 'custom';

export interface RelationshipType {
  /** Stable id stored in the database (relationships.type / inverse_type). Never rename. */
  id: RelationshipTypeId;
  /** Human label shown in pickers. */
  label: string;
  category: RelationshipCategory;
  /** What the other person is to you. Equal to `id` for symmetric types. */
  inverse: RelationshipTypeId;
}

const t = (
  id: RelationshipTypeId,
  label: string,
  category: RelationshipCategory,
  inverse: RelationshipTypeId = id,
): RelationshipType => ({ id, label, category, inverse });

/** Catalog in picker order. */
export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  t('parent', 'Parent', 'family', 'child'),
  t('child', 'Child', 'family', 'parent'),
  t('sibling', 'Sibling', 'family'),
  t('spouse', 'Spouse / partner', 'family'),
  t('grandparent', 'Grandparent', 'family', 'grandchild'),
  t('grandchild', 'Grandchild', 'family', 'grandparent'),
  t('aunt_uncle', 'Aunt / uncle', 'family', 'niece_nephew'),
  t('niece_nephew', 'Niece / nephew', 'family', 'aunt_uncle'),
  t('cousin', 'Cousin', 'family'),
  t('in_law', 'In-law', 'family'),
  t('manager', 'Manager', 'professional', 'direct_report'),
  t('direct_report', 'Direct report', 'professional', 'manager'),
  t('mentor', 'Mentor', 'professional', 'mentee'),
  t('mentee', 'Mentee', 'professional', 'mentor'),
  t('coworker', 'Coworker', 'professional'),
  t('client', 'Client', 'professional', 'provider'),
  t('provider', 'Provider', 'professional', 'client'),
  t('friend', 'Friend', 'social'),
  t('acquaintance', 'Acquaintance', 'social'),
  t('neighbor', 'Neighbor', 'social'),
  t('custom', 'Custom', 'other'),
];
