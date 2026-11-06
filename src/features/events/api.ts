import { supabase } from '@/lib/supabase';

export interface EventSummary {
  id: string;
  name: string;
  /** `YYYY-MM-DD`; null only for rows saved without a date. */
  eventDate: string | null;
  location: string | null;
  description: string | null;
  /** Null when the event is not tied to a network (or its network was deleted). */
  networkId: string | null;
  attendeeCount: number;
}

export interface EventAttendee {
  id: string;
  first_name: string;
  last_name: string | null;
  preferred_name: string | null;
  photo_path: string | null;
  is_self: boolean;
}

export interface EventDetail extends EventSummary {
  attendees: EventAttendee[];
}

/** The fields the form edits; empty optionals are null. */
export interface EventFields {
  name: string;
  eventDate: string;
  location: string | null;
  description: string | null;
  networkId: string | null;
}

const SUMMARY_COLUMNS = 'id, name, event_date, location, description, network_id';
const ATTENDEE_COLUMNS = 'id, first_name, last_name, preferred_name, photo_path, is_self';

function toDbFields(fields: EventFields) {
  return {
    name: fields.name,
    event_date: fields.eventDate,
    location: fields.location,
    description: fields.description,
    network_id: fields.networkId,
  };
}

/** The signed-in user's events (RLS-scoped) with attendee counts, in one query. */
export async function listEvents(): Promise<EventSummary[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`${SUMMARY_COLUMNS}, event_persons(count)`)
    .order('event_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    eventDate: row.event_date,
    location: row.location,
    description: row.description,
    networkId: row.network_id,
    attendeeCount: row.event_persons[0]?.count ?? 0,
  }));
}

/** One event with its attendees (name order), or null when it does not exist. */
export async function getEvent(id: string): Promise<EventDetail | null> {
  const { data, error } = await supabase
    .from('events')
    .select(`${SUMMARY_COLUMNS}, event_persons(person:persons(${ATTENDEE_COLUMNS}))`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const attendees = data.event_persons
    .map((link) => link.person)
    .filter((person): person is EventAttendee => person !== null)
    .sort(
      (a, b) =>
        a.first_name.localeCompare(b.first_name) ||
        (a.last_name ?? '').localeCompare(b.last_name ?? ''),
    );
  return {
    id: data.id,
    name: data.name,
    eventDate: data.event_date,
    location: data.location,
    description: data.description,
    networkId: data.network_id,
    attendeeCount: attendees.length,
    attendees,
  };
}

export async function createEvent(fields: EventFields): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('events')
    .insert(toDbFields(fields))
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, fields: EventFields): Promise<void> {
  const { error } = await supabase.from('events').update(toDbFields(fields)).eq('id', id);
  if (error) throw error;
}

/** Deletes the event; its attendee links go with it (cascade) and the people are kept. */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
