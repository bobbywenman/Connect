-- KT-05: create the profile and the self person ("Me", D-2) for every new
-- auth user.
--
-- Runs as security definer because the inserting role (supabase_auth_admin)
-- has no rights on public tables, and there is no auth.uid() yet, so owner_id
-- is set explicitly. search_path is empty so every name is schema-qualified.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  v_first text;
  v_last text;
begin
  if v_name is not null then
    v_name := left(regexp_replace(v_name, '\s+', ' ', 'g'), 100);
    v_first := split_part(v_name, ' ', 1);
    v_last := nullif(btrim(substr(v_name, char_length(v_first) + 1)), '');
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name);

  insert into public.persons (owner_id, is_self, first_name, last_name)
  values (new.id, true, coalesce(v_first, 'Me'), v_last);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
