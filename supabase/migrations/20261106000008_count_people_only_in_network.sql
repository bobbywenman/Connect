-- KT-13: how many people would deleting a network also delete?
--
-- Same rule as delete_network (D-1): people in this network who belong to no
-- other network, excluding the self person. Used for the delete confirmation.
-- security invoker, so it only ever sees the caller's own rows.

create or replace function public.count_people_only_in_network(network_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
    from public.network_members nm
    join public.persons p on p.id = nm.person_id
   where nm.network_id = count_people_only_in_network.network_id
     and not p.is_self
     and not exists (
       select 1
         from public.network_members other
        where other.person_id = p.id
          and other.network_id <> count_people_only_in_network.network_id
     );
$$;

revoke all on function public.count_people_only_in_network(uuid) from public, anon;
grant execute on function public.count_people_only_in_network(uuid) to authenticated;
