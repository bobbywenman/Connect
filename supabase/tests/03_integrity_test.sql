-- Data integrity: cross-owner links, duplicates, the self person, cascades.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local', '{"name": "Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local', '{"name": "Bob"}');

insert into public.networks (id, owner_id, name, type) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'A family', 'family'),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'B family', 'family');

insert into public.persons (id, owner_id, first_name) values
  ('a0000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'A one'),
  ('a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'A two'),
  ('b0000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'B one');

insert into public.events (id, owner_id, network_id, name) values
  ('a0000000-0000-4000-8000-000000000041', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'A party');

insert into public.study_sessions (id, owner_id, deck_type) values
  ('a0000000-0000-4000-8000-000000000051', '11111111-1111-4111-8111-111111111111', 'network');

-- Everything below runs as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- Defaults ------------------------------------------------------------------
select lives_ok(
  $$insert into public.network_members (network_id, person_id)
    values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011')$$,
  'A can add own person to own network (owner_id defaults to auth.uid())'
);
select is(
  (select owner_id from public.network_members where person_id = 'a0000000-0000-4000-8000-000000000011'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'owner_id defaulted to the caller'
);

-- Cross-owner links are rejected by the composite foreign keys ---------------
select throws_ok(
  $$insert into public.network_members (network_id, person_id)
    values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011')$$,
  '23503',
  null,
  'network_members: own network + other user''s person is rejected'
);
select throws_ok(
  $$insert into public.network_members (network_id, person_id)
    values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012')$$,
  '23503',
  null,
  'network_members: other user''s network + own person is rejected'
);
select throws_ok(
  $$insert into public.relationships (source_person_id, target_person_id, type, inverse_type)
    values ('a0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000011', 'friend', 'friend')$$,
  '23503',
  null,
  'relationships: target owned by another user is rejected'
);
select throws_ok(
  $$insert into public.relationships (source_person_id, target_person_id, type, inverse_type)
    values ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000011', 'friend', 'friend')$$,
  '23503',
  null,
  'relationships: source owned by another user is rejected'
);
select throws_ok(
  $$insert into public.event_persons (event_id, person_id)
    values ('a0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000011')$$,
  '23503',
  null,
  'event_persons: other user''s person is rejected'
);
select throws_ok(
  $$insert into public.events (network_id, name)
    values ('b0000000-0000-4000-8000-000000000001', 'Sneaky')$$,
  '23503',
  null,
  'events: other user''s network is rejected'
);
select throws_ok(
  $$insert into public.study_results (session_id, person_id, prompt_type, result)
    values ('a0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000011', 'face_to_name', 'knew')$$,
  '23503',
  null,
  'study_results: other user''s person is rejected'
);
select throws_ok(
  $$insert into public.duplicate_dismissals (person_a_id, person_b_id)
    values ('a0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000011')$$,
  '23503',
  null,
  'duplicate_dismissals: other user''s person is rejected'
);

-- Relationships ----------------------------------------------------------------
select lives_ok(
  $$insert into public.relationships (source_person_id, target_person_id, type, inverse_type)
    values ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'parent', 'child')$$,
  'A can relate two own people'
);
select throws_ok(
  $$insert into public.relationships (source_person_id, target_person_id, type, inverse_type)
    values ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'parent', 'child')$$,
  '23505',
  null,
  'duplicate relationship (same source, target, type) is rejected'
);
select throws_ok(
  $$insert into public.relationships (source_person_id, target_person_id, type, inverse_type)
    values ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000011', 'friend', 'friend')$$,
  '23514',
  null,
  'a person cannot be related to themselves'
);

-- Check constraints --------------------------------------------------------
select throws_ok(
  $$insert into public.networks (name, type) values ('Clubs', 'club')$$,
  '23514',
  null,
  'network type must be family|friends|work|custom'
);
select throws_ok(
  $$insert into public.networks (name, type) values (repeat('x', 51), 'custom')$$,
  '23514',
  null,
  'network name is at most 50 characters'
);
select throws_ok(
  $$insert into public.study_results (session_id, person_id, prompt_type, result)
    values ('a0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000011', 'face_to_name', 'maybe')$$,
  '23514',
  null,
  'study result must be knew|sortof|didnt'
);
select throws_ok(
  $$insert into public.persons (first_name, import_source) values ('X', 'facebook')$$,
  '23514',
  null,
  'import_source must be manual|contacts|linkedin'
);

-- Self person (D-2) --------------------------------------------------------
select results_eq(
  $$with d as (delete from public.persons where is_self returning 1) select count(*)::int from d$$,
  array[0],
  'the self person cannot be deleted'
);
select is(
  (select count(*)::int from public.persons where is_self),
  1,
  'the self person is still there'
);
select throws_ok(
  $$update public.persons set is_self = false where is_self$$,
  '42501',
  null,
  'is_self cannot be switched off'
);
select throws_ok(
  $$update public.persons set is_self = true where id = 'a0000000-0000-4000-8000-000000000012'$$,
  '42501',
  null,
  'is_self cannot be switched on'
);

-- updated_at ---------------------------------------------------------------
reset role;
update public.networks set updated_at = '2000-01-01' where id = 'a0000000-0000-4000-8000-000000000001';
select ok(
  (select updated_at > '2000-01-02' from public.networks where id = 'a0000000-0000-4000-8000-000000000001'),
  'updated_at is maintained by the trigger'
);

-- Cascades -----------------------------------------------------------------
delete from public.persons where id = 'a0000000-0000-4000-8000-000000000011';
select is(
  (select count(*)::int from public.network_members where person_id = 'a0000000-0000-4000-8000-000000000011')
    + (select count(*)::int from public.relationships where source_person_id = 'a0000000-0000-4000-8000-000000000011'),
  0,
  'deleting a person removes their memberships and relationships'
);

delete from public.networks where id = 'a0000000-0000-4000-8000-000000000001';
select results_eq(
  $$select network_id, owner_id from public.events where id = 'a0000000-0000-4000-8000-000000000041'$$,
  $$values (null::uuid, '11111111-1111-4111-8111-111111111111'::uuid)$$,
  'deleting a network keeps its events, clears only network_id'
);

select * from finish();
rollback;
