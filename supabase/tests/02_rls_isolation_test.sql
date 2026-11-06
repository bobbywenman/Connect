-- Row Level Security: user A can never select, insert, update or delete
-- user B's rows, in any table.
begin;
create extension if not exists pgtap with schema extensions;

select plan(68);

-- Fixtures, created as postgres (RLS does not apply).
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local');

insert into public.networks (id, owner_id, name, type) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'A family', 'family'),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'B family', 'family');

insert into public.persons (id, owner_id, first_name) values
  ('a0000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'A one'),
  ('a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'A two'),
  ('a0000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'A three'),
  ('b0000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'B one'),
  ('b0000000-0000-4000-8000-000000000012', '22222222-2222-4222-8222-222222222222', 'B two'),
  ('b0000000-0000-4000-8000-000000000013', '22222222-2222-4222-8222-222222222222', 'B three');

insert into public.network_members (owner_id, network_id, person_id) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011');

insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'parent', 'child'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000012', 'parent', 'child');

insert into public.custom_relationship_types (owner_id, label, inverse_label) values
  ('11111111-1111-4111-8111-111111111111', 'godparent', 'godchild'),
  ('22222222-2222-4222-8222-222222222222', 'godparent', 'godchild');

insert into public.events (id, owner_id, network_id, name) values
  ('a0000000-0000-4000-8000-000000000041', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'A party'),
  ('b0000000-0000-4000-8000-000000000041', '22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000001', 'B party');

insert into public.event_persons (owner_id, event_id, person_id) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000011'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000011');

insert into public.study_sessions (id, owner_id, deck_type) values
  ('a0000000-0000-4000-8000-000000000051', '11111111-1111-4111-8111-111111111111', 'network'),
  ('b0000000-0000-4000-8000-000000000051', '22222222-2222-4222-8222-222222222222', 'network');

insert into public.study_results (owner_id, session_id, person_id, prompt_type, result) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000011', 'face_to_name', 'knew'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000011', 'face_to_name', 'didnt');

insert into public.duplicate_dismissals (owner_id, person_a_id, person_b_id) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000012');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- profiles
select results_eq($$select count(*)::int from public.profiles$$, array[1], 'profiles: A sees only own rows');
select is_empty($$select 1 from public.profiles where id = '22222222-2222-4222-8222-222222222222'$$, 'profiles: A cannot select B''s rows');
select throws_ok($$insert into public.profiles (id) values ('22222222-2222-4222-8222-222222222222')$$, '42501', null, 'profiles: A cannot insert a row owned by B');
select results_eq($$with u as (update public.profiles set display_name = 'hacked' where id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'profiles: A cannot update B''s rows');
select throws_ok($$update public.profiles set id = '22222222-2222-4222-8222-222222222222' where id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'profiles: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.profiles where id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'profiles: A cannot delete B''s rows');

-- networks
select results_eq($$select count(*)::int from public.networks$$, array[1], 'networks: A sees only own rows');
select is_empty($$select 1 from public.networks where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'networks: A cannot select B''s rows');
select throws_ok($$insert into public.networks (owner_id, name, type) values ('22222222-2222-4222-8222-222222222222', 'x', 'custom')$$, '42501', null, 'networks: A cannot insert a row owned by B');
select results_eq($$with u as (update public.networks set name = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'networks: A cannot update B''s rows');
select throws_ok($$update public.networks set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'networks: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.networks where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'networks: A cannot delete B''s rows');

-- persons
select results_eq($$select count(*)::int from public.persons$$, array[4], 'persons: A sees only own rows');
select is_empty($$select 1 from public.persons where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'persons: A cannot select B''s rows');
select throws_ok($$insert into public.persons (owner_id, first_name) values ('22222222-2222-4222-8222-222222222222', 'x')$$, '42501', null, 'persons: A cannot insert a row owned by B');
select results_eq($$with u as (update public.persons set first_name = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'persons: A cannot update B''s rows');
select throws_ok($$update public.persons set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'persons: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.persons where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'persons: A cannot delete B''s rows');

-- network_members
select results_eq($$select count(*)::int from public.network_members$$, array[1], 'network_members: A sees only own rows');
select is_empty($$select 1 from public.network_members where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'network_members: A cannot select B''s rows');
select throws_ok($$insert into public.network_members (owner_id, network_id, person_id) values ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000012')$$, '42501', null, 'network_members: A cannot insert a row owned by B');
select results_eq($$with u as (update public.network_members set added_at = '2000-01-01' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'network_members: A cannot update B''s rows');
select throws_ok($$update public.network_members set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'network_members: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.network_members where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'network_members: A cannot delete B''s rows');

-- relationships
select results_eq($$select count(*)::int from public.relationships$$, array[1], 'relationships: A sees only own rows');
select is_empty($$select 1 from public.relationships where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'relationships: A cannot select B''s rows');
select throws_ok($$insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type) values ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000011', 'friend', 'friend')$$, '42501', null, 'relationships: A cannot insert a row owned by B');
select results_eq($$with u as (update public.relationships set notes = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'relationships: A cannot update B''s rows');
select throws_ok($$update public.relationships set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'relationships: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.relationships where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'relationships: A cannot delete B''s rows');

-- custom_relationship_types
select results_eq($$select count(*)::int from public.custom_relationship_types$$, array[1], 'custom_relationship_types: A sees only own rows');
select is_empty($$select 1 from public.custom_relationship_types where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'custom_relationship_types: A cannot select B''s rows');
select throws_ok($$insert into public.custom_relationship_types (owner_id, label, inverse_label) values ('22222222-2222-4222-8222-222222222222', 'x', 'y')$$, '42501', null, 'custom_relationship_types: A cannot insert a row owned by B');
select results_eq($$with u as (update public.custom_relationship_types set label = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'custom_relationship_types: A cannot update B''s rows');
select throws_ok($$update public.custom_relationship_types set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'custom_relationship_types: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.custom_relationship_types where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'custom_relationship_types: A cannot delete B''s rows');

-- events
select results_eq($$select count(*)::int from public.events$$, array[1], 'events: A sees only own rows');
select is_empty($$select 1 from public.events where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'events: A cannot select B''s rows');
select throws_ok($$insert into public.events (owner_id, name) values ('22222222-2222-4222-8222-222222222222', 'x')$$, '42501', null, 'events: A cannot insert a row owned by B');
select results_eq($$with u as (update public.events set name = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'events: A cannot update B''s rows');
select throws_ok($$update public.events set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'events: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.events where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'events: A cannot delete B''s rows');

-- event_persons
select results_eq($$select count(*)::int from public.event_persons$$, array[1], 'event_persons: A sees only own rows');
select is_empty($$select 1 from public.event_persons where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'event_persons: A cannot select B''s rows');
select throws_ok($$insert into public.event_persons (owner_id, event_id, person_id) values ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000012')$$, '42501', null, 'event_persons: A cannot insert a row owned by B');
select results_eq($$with u as (update public.event_persons set created_at = '2000-01-01' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'event_persons: A cannot update B''s rows');
select throws_ok($$update public.event_persons set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'event_persons: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.event_persons where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'event_persons: A cannot delete B''s rows');

-- study_sessions
select results_eq($$select count(*)::int from public.study_sessions$$, array[1], 'study_sessions: A sees only own rows');
select is_empty($$select 1 from public.study_sessions where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'study_sessions: A cannot select B''s rows');
select throws_ok($$insert into public.study_sessions (owner_id, deck_type) values ('22222222-2222-4222-8222-222222222222', 'x')$$, '42501', null, 'study_sessions: A cannot insert a row owned by B');
select results_eq($$with u as (update public.study_sessions set deck_type = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'study_sessions: A cannot update B''s rows');
select throws_ok($$update public.study_sessions set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'study_sessions: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.study_sessions where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'study_sessions: A cannot delete B''s rows');

-- study_results
select results_eq($$select count(*)::int from public.study_results$$, array[1], 'study_results: A sees only own rows');
select is_empty($$select 1 from public.study_results where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'study_results: A cannot select B''s rows');
select throws_ok($$insert into public.study_results (owner_id, session_id, person_id, prompt_type, result) values ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000012', 'x', 'knew')$$, '42501', null, 'study_results: A cannot insert a row owned by B');
select results_eq($$with u as (update public.study_results set prompt_type = 'hacked' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'study_results: A cannot update B''s rows');
select throws_ok($$update public.study_results set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'study_results: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.study_results where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'study_results: A cannot delete B''s rows');

-- duplicate_dismissals
select results_eq($$select count(*)::int from public.duplicate_dismissals$$, array[1], 'duplicate_dismissals: A sees only own rows');
select is_empty($$select 1 from public.duplicate_dismissals where owner_id = '22222222-2222-4222-8222-222222222222'$$, 'duplicate_dismissals: A cannot select B''s rows');
select throws_ok($$insert into public.duplicate_dismissals (owner_id, person_a_id, person_b_id) values ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000013')$$, '42501', null, 'duplicate_dismissals: A cannot insert a row owned by B');
select results_eq($$with u as (update public.duplicate_dismissals set created_at = '2000-01-01' where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u$$, array[0], 'duplicate_dismissals: A cannot update B''s rows');
select throws_ok($$update public.duplicate_dismissals set owner_id = '22222222-2222-4222-8222-222222222222' where owner_id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'duplicate_dismissals: A cannot hand own rows over to B');
select results_eq($$with d as (delete from public.duplicate_dismissals where owner_id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from d$$, array[0], 'duplicate_dismissals: A cannot delete B''s rows');

-- Signed out (anon) sees nothing and cannot write.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$select 1 from public.persons$$,
  '42501',
  null,
  'anon cannot read persons'
);

-- Back as postgres: none of B's data changed.
reset role;
select results_eq(
  $$
    select
      (select count(*)::int from public.networks where owner_id = '22222222-2222-4222-8222-222222222222' and name = 'B family')
    + (select count(*)::int from public.persons where owner_id = '22222222-2222-4222-8222-222222222222' and first_name <> 'hacked')
    + (select count(*)::int from public.network_members where owner_id = '22222222-2222-4222-8222-222222222222')
    + (select count(*)::int from public.relationships where owner_id = '22222222-2222-4222-8222-222222222222' and notes is null)
    + (select count(*)::int from public.custom_relationship_types where owner_id = '22222222-2222-4222-8222-222222222222' and label = 'godparent')
    + (select count(*)::int from public.events where owner_id = '22222222-2222-4222-8222-222222222222' and name = 'B party')
    + (select count(*)::int from public.event_persons where owner_id = '22222222-2222-4222-8222-222222222222')
    + (select count(*)::int from public.study_sessions where owner_id = '22222222-2222-4222-8222-222222222222' and deck_type = 'network')
    + (select count(*)::int from public.study_results where owner_id = '22222222-2222-4222-8222-222222222222' and prompt_type = 'face_to_name')
    + (select count(*)::int from public.duplicate_dismissals where owner_id = '22222222-2222-4222-8222-222222222222')
    + (select count(*)::int from public.profiles where id = '22222222-2222-4222-8222-222222222222' and display_name is null)
  $$,
  array[1 + 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1],
  'all of B''s rows are intact after A''s attempts'
);

select * from finish();
rollback;
