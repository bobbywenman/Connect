// The only place the notifications feature talks to Supabase: the rows reminders are planned from.
import { getMyProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';

import { parseReminderSettings, type ReminderPerson, type ReminderSettings } from './plan';

const COLUMNS =
  'id, first_name, preferred_name, birthdate, birthday_reminder, anniversary_date, anniversary_reminder, archived_at, is_self';

/** Active people (not archived, not "You") with a reminder switched on: one query. */
export async function listReminderPeople(userId: string): Promise<ReminderPerson[]> {
  const { data, error } = await supabase
    .from('persons')
    .select(COLUMNS)
    .eq('owner_id', userId)
    .eq('is_self', false)
    .is('archived_at', null)
    .or('birthday_reminder.eq.true,anniversary_reminder.eq.true');
  if (error) throw error;
  return (data ?? []) as ReminderPerson[];
}

/** First active person with a birthday, for the dev-only test reminder. */
export async function findPersonWithBirthday(
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('id, first_name, preferred_name')
    .eq('owner_id', userId)
    .eq('is_self', false)
    .is('archived_at', null)
    .not('birthdate', 'is', null)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  return row ? { id: row.id, name: row.preferred_name?.trim() || row.first_name } : null;
}

export async function getReminderSettings(userId: string): Promise<ReminderSettings> {
  const profile = await getMyProfile(userId);
  return parseReminderSettings(profile?.settings);
}
