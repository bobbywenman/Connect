-- delete_network(network_id) (D-1): removes the network, deletes people left
-- with no network, keeps people in other networks and the self person.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local');

insert into public.networks (id, owner_id, name, type) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Family', 'family'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Work', 'work'),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'B family', 'family');

insert into public.persons (id, owner_id, first_name) values
  ('a0000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'Only family 1'),
  ('a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'Only family 2'),
  ('a0000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'Family and work'),
  ('a0000000-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', 'In no network'),
  ('b0000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'B person');

-- The self person is shown in every network by the app, but a membership row
-- for it must not get it deleted either.
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

select throws_ok(
  $$select public.delete_network('b0000000-0000-4000-8000-000000000001')$$,
  'P0002',
  null,
  'A cannot delete B''s network'
);

select is(
  public.delete_network('a0000000-0000-4000-8000-000000000001'),
  2,
  'returns the number of people deleted'
);

select is_empty(
  $$select 1 from public.networks where id = 'a0000000-0000-4000-8000-000000000001'$$,
  'the network is gone'
);
select is_empty(
  $$select 1 from public.persons where id in ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012')$$,
  'people left with no network are deleted'
);
select isnt_empty(
  $$select 1 from public.persons where id = 'a0000000-0000-4000-8000-000000000013'$$,
  'people still in another network are kept'
);
select isnt_empty(
  $$select 1 from public.persons where id = 'a0000000-0000-4000-8000-000000000014'$$,
  'people who were not in the network are untouched'
);
select is(
  (select count(*)::int from public.persons where is_self),
  1,
  'the self person is kept'
);

select throws_ok(
  $$select public.delete_network('a0000000-0000-4000-8000-000000000001')$$,
  'P0002',
  null,
  'deleting a missing network raises no_data_found'
);

reset role;
select results_eq(
  $$select
      (select count(*)::int from public.networks where owner_id = '22222222-2222-4222-8222-222222222222')
    + (select count(*)::int from public.persons where owner_id = '22222222-2222-4222-8222-222222222222')$$,
  array[3],
  'B''s network and people (incl. self) are untouched'
);

select * from finish();
rollback;
