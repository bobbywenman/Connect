-- Schema-wide security checks: RLS on every table, nothing for anon.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

select tables_are(
  'public',
  array[
    'profiles',
    'networks',
    'persons',
    'network_members',
    'relationships',
    'custom_relationship_types',
    'events',
    'event_persons',
    'study_sessions',
    'study_results',
    'duplicate_dismissals'
  ],
  'public schema has exactly the v1 tables (add new tables here and to the RLS tests)'
);

select is(
  array(
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and not c.relrowsecurity
     order by 1
  ),
  '{}'::text[],
  'RLS is enabled on every public table'
);

select is(
  array(
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and (
         select count(distinct p.cmd)
           from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname
       ) = 0
     order by 1
  ),
  '{}'::text[],
  'every public table has at least one policy'
);

select is_empty(
  $$
    select p.tablename, p.policyname, p.roles
      from pg_policies p
     where p.schemaname = 'public'
       and not (p.roles = '{authenticated}'::name[])
  $$,
  'every public policy applies to the authenticated role only'
);

select is_empty(
  $$
    select c.relname, priv
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as priv
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'v', 'm')
       and has_table_privilege('anon', c.oid, priv)
  $$,
  'anon has no privileges on any public table'
);

select is_empty(
  $$
    select c.relname, priv
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     cross join unnest(array['TRUNCATE', 'REFERENCES', 'TRIGGER']) as priv
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and has_table_privilege('authenticated', c.oid, priv)
  $$,
  'authenticated cannot TRUNCATE (which skips RLS), REFERENCE or add TRIGGERs'
);

select is_empty(
  $$
    select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and has_function_privilege('anon', p.oid, 'execute')
  $$,
  'anon cannot execute any public function'
);

select is(
  array(
    select p.proname::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and has_function_privilege('authenticated', p.oid, 'execute')
     order by 1
  ),
  array['count_people_only_in_network', 'delete_network', 'search_people'],
  'authenticated can execute only the allowed functions (count_people_only_in_network, delete_network, search_people)'
);

select * from finish();
rollback;
