import { networkColors } from '@/constants';

const FALLBACK_COLOR = 'gray';

/** Resolve a stored network color name ("blue") to its hex value. Unknown or missing names fall back to gray. */
export function resolveNetworkColor(name: string | null | undefined): string {
  const match = networkColors.find((c) => c.name === name);
  const fallback = networkColors.find((c) => c.name === FALLBACK_COLOR);
  return (match ?? fallback)?.value ?? '#5F6773';
}

export const networkTypeLabels: Record<string, string> = {
  family: 'Family',
  friends: 'Friends',
  work: 'Work',
  custom: 'Custom',
};

/** Human label for a network type; unknown types are capitalised as-is. */
export function networkTypeLabel(type: string): string {
  return networkTypeLabels[type] ?? (type.charAt(0).toUpperCase() + type.slice(1) || 'Custom');
}

/** "1 person" / "8 people". */
export function formatPersonCount(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`;
}
