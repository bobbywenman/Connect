// Pure helpers for the "New this month" section (KT-28). No I/O, so everything here is unit tested.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Midnight on the first day of `now`'s month, in the device's local time zone. */
export function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** "Nov 3", from an ISO timestamp, in local time. */
export function formatAddedDate(createdAt: string): string {
  const date = new Date(createdAt);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Second line for a row: "Family, Book club · Added Nov 3", or just the date with no networks. */
export function newPersonLabel(networkNames: readonly string[], createdAt: string): string {
  const added = `Added ${formatAddedDate(createdAt)}`;
  return networkNames.length > 0 ? `${networkNames.join(', ')} · ${added}` : added;
}
