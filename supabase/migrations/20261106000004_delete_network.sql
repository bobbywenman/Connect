-- KT-05: delete a network (D-1).
--
-- Deletes the network (its memberships cascade), then deletes the people who
-- were in it and now belong to no network at all. The self person is never
-- deleted. Returns how many people were deleted.
--
-- security invoker: everything runs under the caller's RLS, so a user can
-- only ever delete their own network and their own people. Raises
-- no_data_found (P0002) when the network does not exist or is not visible.

create or replace function public.delete_network(network_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_person_ids uuid[];
  v_deleted integer;
begin
  select coalesce(array_agg(nm.person_id), '{}')
    into v_person_ids
    from public.network_members nm
   where nm.network_id = delete_network.network_id;

  delete from public.networks n
   where n.id = delete_network.network_id;

  if not found then
    raise exception 'network % not found', delete_network.network_id
      using errcode = 'P0002';
  end if;

  delete from public.persons p
   where p.id = any (v_person_ids)
     and not p.is_self
     and not exists (
       select 1 from public.network_members nm where nm.person_id = p.id
     );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.delete_network(uuid) from public, anon;
grant execute on function public.delete_network(uuid) to authenticated;
