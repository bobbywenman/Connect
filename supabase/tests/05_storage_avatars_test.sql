-- avatars bucket: private, and each user only reaches objects under {uid}/.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local');

select is(
  (select public from storage.buckets where id = 'avatars'),
  false,
  'avatars bucket exists and is private'
);

insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', '22222222-2222-4222-8222-222222222222/b-person.jpg', '22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '11111111-1111-4111-8111-111111111111/a-person.jpg', '11111111-1111-4111-8111-111111111111')$$,
  'A can upload into own folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '22222222-2222-4222-8222-222222222222/evil.jpg', '11111111-1111-4111-8111-111111111111')$$,
  '42501',
  null,
  'A cannot upload into B''s folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', 'loose.jpg', '11111111-1111-4111-8111-111111111111')$$,
  '42501',
  null,
  'A cannot upload outside a user folder'
);
select results_eq(
  $$select name from storage.objects where bucket_id = 'avatars'$$,
  $$values ('11111111-1111-4111-8111-111111111111/a-person.jpg'::text)$$,
  'A only sees objects in own folder'
);
select results_eq(
  $$with u as (
      update storage.objects set metadata = '{"hacked": true}'
       where name like '22222222-2222-4222-8222-222222222222/%' returning 1)
    select count(*)::int from u$$,
  array[0],
  'A cannot update objects in B''s folder'
);

reset role;
select is(
  (select count(*)::int from storage.objects
    where name = '22222222-2222-4222-8222-222222222222/b-person.jpg' and metadata is null),
  1,
  'B''s object is untouched'
);

select * from finish();
rollback;
