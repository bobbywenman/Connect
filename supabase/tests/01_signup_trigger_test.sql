-- Signup trigger: one profile and one self person per new auth user (D-2).
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-4000-8000-000000000001', 'named@test.local', '{"name": "Sarah  Jane Smith"}'),
  ('a1000000-0000-4000-8000-000000000002', 'fullname@test.local', '{"full_name": "Kenji Tanaka"}'),
  ('a1000000-0000-4000-8000-000000000003', 'anon@test.local', '{}');

select is(
  (select count(*)::int from public.profiles where id = 'a1000000-0000-4000-8000-000000000001'),
  1,
  'signup creates exactly one profile'
);
select is(
  (select count(*)::int from public.persons where owner_id = 'a1000000-0000-4000-8000-000000000001'),
  1,
  'signup creates exactly one person'
);
select ok(
  (select is_self from public.persons where owner_id = 'a1000000-0000-4000-8000-000000000001'),
  'that person is the self person'
);
select is(
  (select display_name from public.profiles where id = 'a1000000-0000-4000-8000-000000000001'),
  'Sarah Jane Smith',
  'display_name comes from metadata name (whitespace collapsed)'
);
select results_eq(
  $$select first_name, last_name from public.persons where owner_id = 'a1000000-0000-4000-8000-000000000001'$$,
  $$values ('Sarah'::text, 'Jane Smith'::text)$$,
  'self person name is split from metadata name'
);
select results_eq(
  $$select first_name, last_name from public.persons where owner_id = 'a1000000-0000-4000-8000-000000000002'$$,
  $$values ('Kenji'::text, 'Tanaka'::text)$$,
  'falls back to metadata full_name'
);
select is(
  (select display_name from public.profiles where id = 'a1000000-0000-4000-8000-000000000002'),
  'Kenji Tanaka',
  'display_name from full_name'
);
select results_eq(
  $$select first_name, last_name from public.persons where owner_id = 'a1000000-0000-4000-8000-000000000003'$$,
  $$values ('Me'::text, null::text)$$,
  'self person is called Me when no name is given'
);
select is(
  (select display_name from public.profiles where id = 'a1000000-0000-4000-8000-000000000003'),
  null,
  'display_name is null when no name is given'
);
select results_eq(
  $$select onboarding_complete, settings from public.profiles where id = 'a1000000-0000-4000-8000-000000000003'$$,
  $$values (false, '{}'::jsonb)$$,
  'profile defaults: onboarding not complete, empty settings'
);

select throws_ok(
  $$insert into public.persons (owner_id, is_self, first_name)
    values ('a1000000-0000-4000-8000-000000000001', true, 'Second me')$$,
  '23505',
  null,
  'a second self person for the same owner is rejected'
);

delete from auth.users where id = 'a1000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.persons where owner_id = 'a1000000-0000-4000-8000-000000000001')
    + (select count(*)::int from public.profiles where id = 'a1000000-0000-4000-8000-000000000001'),
  0,
  'deleting the auth user removes the profile and the self person'
);

select * from finish();
rollback;
