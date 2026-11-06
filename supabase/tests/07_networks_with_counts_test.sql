-- networks_with_counts (KT-12): counts members, skips archived and self
-- people, and respects RLS (security invoker).
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local');

insert into public.networks (id, owner_id, name, type, color) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'A family', 'family', 'blue'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'A empty', 'custom', 'gray'),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'B family', 'family', 'red');

insert into public.persons (id, owner_id, first_name, archived_at) values
  ('a0000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'One', null),
  ('a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'Two', null),
  ('a0000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'Archived', now()),
  ('b0000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'B person', null);

-- Includes the self person's row on purpose: it must not be counted.
insert into public.network_members (owner_id, network_id, person_id)
select '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', id
  from public.persons
 where owner_id = '11111111-1111-4111-8111-111111111111'
   and (is_self or id in (
     'a0000000-0000-4000-8000-000000000011',
     'a0000000-0000-4000-8000-000000000012',
     'a0000000-0000-4000-8000-000000000013'));

insert into public.network_members (owner_id, network_id, person_id) values
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is(
  (select person_count from public.networks_with_counts where name = 'A family'),
  2,
  'counts members, excluding the archived person and the self person'
);

select is(
  (select person_count from public.networks_with_counts where name = 'A empty'),
  0,
  'a network with no members counts 0'
);

select is(
  (select count(*)::integer from public.networks_with_counts),
  2,
  'A sees only their own networks'
);

select is(
  (select count(*)::integer from public.networks_with_counts where name = 'B family'),
  0,
  'A cannot see B''s network through the view'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.networks_with_counts$$,
  '42501',
  null,
  'anon cannot read the view'
);

select * from finish();
rollback;
