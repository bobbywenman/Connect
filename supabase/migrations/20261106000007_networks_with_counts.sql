-- KT-12: networks plus a live member count, in one query for the home screen.
--
-- person_count counts network_members rows whose person is not archived and is
-- not the self person (the self person is shown by the app, never counted).
-- security_invoker = true makes the view run with the caller's RLS, so a user
-- only ever sees their own networks and counts their own memberships.

create view public.networks_with_counts
with (security_invoker = true)
as
select
  n.id,
  n.name,
  n.type,
  n.color,
  n.description,
  n.created_at,
  (
    select count(*)
      from public.network_members nm
      join public.persons p on p.id = nm.person_id
     where nm.network_id = n.id
       and p.archived_at is null
       and not p.is_self
  )::integer as person_count
from public.networks n;

revoke all on public.networks_with_counts from anon;
grant select on public.networks_with_counts to authenticated;
