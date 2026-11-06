// Pure rules about people. Screens that offer actions on a person ask these first.

/**
 * Whether a person may be deleted. The self person ("You", D-2) can never be deleted:
 * RLS blocks it in the database, and screens should not offer the action at all.
 */
export function canDeletePerson(person: { is_self: boolean }): boolean {
  return !person.is_self;
}
