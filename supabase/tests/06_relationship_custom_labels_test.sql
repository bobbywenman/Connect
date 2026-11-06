-- Custom relationship labels: inverse_custom_label only allowed for type = 'custom'.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local', '{"name": "Alice"}');

insert into public.persons (id, owner_id, first_name) values
  ('a0000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'A one'),
  ('a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'A two');

select lives_ok(
  $$insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type, custom_label, inverse_custom_label)
    values ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'custom', 'custom', 'Landlord', 'Tenant')$$,
  'custom type accepts both labels'
);
select throws_ok(
  $$insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type, inverse_custom_label)
    values ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'friend', 'friend', 'Tenant')$$,
  '23514', null, 'non-custom type with inverse_custom_label is rejected'
);
select lives_ok(
  $$insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type)
    values ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'friend', 'friend')$$,
  'non-custom type without labels is fine'
);
select throws_ok(
  $$insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type, custom_label, inverse_custom_label)
    values ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000011', 'custom', 'custom', 'x', repeat('a', 51))$$,
  '23514', null, 'inverse_custom_label over 50 characters is rejected'
);
select throws_ok(
  $$insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type, custom_label)
    values ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000011', 'custom', 'custom', repeat('a', 51))$$,
  '23514', null, 'custom_label over 50 characters is rejected'
);

select * from finish();
rollback;
