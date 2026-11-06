-- count_people_only_in_network (KT-13): matches what delete_network would
-- delete; skips the self person and people in other networks; respects RLS.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local');

insert into public.networks (id, owner_id, name, type) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Family', 'family'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Work', 'work'),
  ('a0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Empty', 'custom'),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'B family', 'family');

insert into public.persons (id, owner_id, first_name) values
  ('a0000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'Only family 1'),
  ('a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'Only family 2'),
  ('a0000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'Family and work'),
  ('b0000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'B person');

-- Includes a membership row for the self person: it must not be counted.
insert into public.network_members (owner_id, network_id, person_id)
select '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', id
  from public.persons
 where owner_id = '11111111-1111-4111-8111-111111111111'
   and (is_self or id in (
     'a0000000-0000-4000-8000-000000000011',
     'a0000000-0000-4000-8000-000000000012',
     'a0000000-0000-4000-8000-000000000013'));

insert into public.network_members (owner_id, network_id, person_id) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000013'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is(
  public.count_people_only_in_network('a0000000-0000-4000-8000-000000000001'),
  2,
  'Family: two people only here; the shared person and self are not counted'
);

select is(
  public.count_people_only_in_network('a0000000-0000-4000-8000-000000000002'),
  0,
  'Work: its only member is also in Family'
);

select is(
  public.count_people_only_in_network('a0000000-0000-4000-8000-000000000003'),
  0,
  'an empty network counts 0'
);

select is(
  public.count_people_only_in_network('b0000000-0000-4000-8000-000000000001'),
  0,
  'another user''s network counts 0 under RLS'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.count_people_only_in_network('a0000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'anon cannot call it'
);

select * from finish();
rollback;
