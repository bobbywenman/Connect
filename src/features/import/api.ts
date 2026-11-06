// Database access for imports. Person creation itself lives in people/api (`createPerson`).
import { supabase } from '@/lib/supabase';

const PAGE = 1000;

/**
 * Source ids (e.g. phone contact ids) of people already imported from `source`, so the same
 * contact is never imported twice. Pages through the results: PostgREST returns at most 1000 rows.
 */
export async function listImportedSourceIds(source: 'contacts' | 'linkedin'): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('persons')
      .select('external_ids')
      .eq('import_source', source)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const value = (row.external_ids as Record<string, unknown> | null)?.[source];
      if (typeof value === 'string' && value) ids.add(value);
    }
    if (!data || data.length < PAGE) return ids;
  }
}
