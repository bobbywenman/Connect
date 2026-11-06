-- KT-05: Row Level Security and grants.
--
-- Every public table has RLS on, and separate select / insert / update /
-- delete policies for the authenticated role only. anon gets nothing.
-- (select auth.uid()) is wrapped in a sub-select so Postgres evaluates it once
-- per statement instead of once per row.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Supabase grants everything to anon and authenticated by default. Signed-out
-- users have no business in this schema, and TRUNCATE / REFERENCES / TRIGGER
-- are not covered by RLS, so take them away from app roles.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke truncate, references, trigger on all tables in schema public from authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon, public;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- Trigger functions are not meant to be called directly.
revoke all on function public.set_updated_at() from authenticated;
revoke all on function public.persons_guard_is_self() from authenticated;

-- ---------------------------------------------------------------------------
-- profiles (the row's id is the owner)
-- No delete policy: a profile goes away only when the auth user is deleted.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- persons: same as the generic owner policies, except the self person can
-- never be deleted (D-2).
-- ---------------------------------------------------------------------------
alter table public.persons enable row level security;

create policy "persons: select own" on public.persons
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "persons: insert own" on public.persons
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "persons: update own" on public.persons
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "persons: delete own, not self" on public.persons
  for delete to authenticated using (owner_id = (select auth.uid()) and not is_self);

-- ---------------------------------------------------------------------------
-- Every other table: owner_id = auth.uid() for all four commands.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'networks',
    'network_members',
    'relationships',
    'custom_relationship_types',
    'events',
    'event_persons',
    'study_sessions',
    'study_results',
    'duplicate_dismissals'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = (select auth.uid()))',
      t || ': select own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))',
      t || ': insert own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      t || ': update own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = (select auth.uid()))',
      t || ': delete own', t);
  end loop;
end;
$$;
