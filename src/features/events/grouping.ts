export interface Dated {
  /** `YYYY-MM-DD`, or null for an event saved without a date (the database allows it). */
  eventDate: string | null;
}

export interface GroupedEvents<T> {
  /** Today and later, soonest first. Undated events come last. */
  upcoming: T[];
  /** Before today, most recent first. */
  past: T[];
}

/**
 * Split events into upcoming and past around `today` (`YYYY-MM-DD`). An event today is
 * still upcoming. ISO dates compare correctly as strings. Does not mutate the input.
 */
export function groupEvents<T extends Dated>(
  events: readonly T[],
  today: string,
): GroupedEvents<T> {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    if (event.eventDate === null || event.eventDate >= today) upcoming.push(event);
    else past.push(event);
  }
  upcoming.sort((a, b) => {
    if (a.eventDate === b.eventDate) return 0;
    if (a.eventDate === null) return 1;
    if (b.eventDate === null) return -1;
    return a.eventDate < b.eventDate ? -1 : 1;
  });
  // Everything in `past` has a date.
  past.sort((a, b) => ((a.eventDate as string) < (b.eventDate as string) ? 1 : -1));
  return { upcoming, past };
}
