-- search_people (KT-27): RLS isolation, ranking, accent/case-insensitive matching,
-- archived people excluded, anon cannot execute.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local');

insert into public.networks (id, owner_id, name, type, color) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Climbing club', 'custom', 'green');

-- A: a name match, a tag match and a notes match for "sail", plus accent, archived and
-- wildcard cases. B has someone who would match everything.
insert into public.persons (id, owner_id, first_name, last_name, tags, notes, job_title, archived_at) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Sailor', 'Moon', '{}', null, null, null),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Tara', 'Tag', '{sailing,hiking}', null, null, null),
  ('a0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Nora', 'Notes', '{}', 'Spent the summer learning to sail with her dad and loves it.', null, null),
  ('a0000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'José', 'García', '{}', null, 'Harbour master', null),
  ('a0000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Gone', 'Sailor', '{sailing}', 'sail', null, now()),
  ('a0000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Fifty', 'Percent', '{}', 'Gave 50% to charity', null, null),
  ('b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Sailor', 'Secret', '{sailing}', 'sail sail sail', 'sail', null);

insert into public.network_members (owner_id, network_id, person_id) values
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is(
  array(select id::text from public.search_people('sail')),
  array[
    'a0000000-0000-4000-8000-000000000001', -- name (prefix)
    'a0000000-0000-4000-8000-000000000002', -- tag
    'a0000000-0000-4000-8000-000000000003'  -- notes
  ],
  'ranks name matches above tag matches above notes matches'
);

select is(
  (select array_agg(match_field order by rank desc, id) from public.search_people('sail')),
  array['name', 'tag', 'notes'],
  'reports which field matched'
);

select is(
  (select match_snippet from public.search_people('sail') where id = 'a0000000-0000-4000-8000-000000000002'),
  'sailing',
  'a tag match reports the tag'
);

select ok(
  (select match_snippet from public.search_people('sail') where id = 'a0000000-0000-4000-8000-000000000003') like '%learning to sail%',
  'a notes match reports a snippet around the hit'
);

select is(
  array(select id::text from public.search_people('JOSE')),
  array['a0000000-0000-4000-8000-000000000004'],
  'matches case- and accent-insensitively ("JOSE" finds "José")'
);

select is(
  array(select id::text from public.search_people('garcia')),
  array['a0000000-0000-4000-8000-000000000004'],
  'unaccented query finds an accented last name'
);

select is(
  array(select id::text from public.search_people('harbor')),
  array[]::text[],
  'job title match needs a substring ("harbor" is not in "Harbour")'
);

select is(
  array(select id::text from public.search_people('harbour')),
  array['a0000000-0000-4000-8000-000000000004'],
  'matches the job title'
);

select is(
  array(select id::text from public.search_people('Moom')),
  array['a0000000-0000-4000-8000-000000000001'],
  'a near-miss spelling is found by trigram similarity'
);

select is(
  array(select id::text from public.search_people('50%')),
  array['a0000000-0000-4000-8000-000000000006'],
  'LIKE wildcards in the query are matched literally'
);

select is(
  (select networks->0->>'name' from public.search_people('tara')),
  'Climbing club',
  'returns the person''s networks'
);

-- B has the same words, but A must never see them (and the archived row stays hidden).
select is(
  (select count(*)::integer from public.search_people('secret')),
  0,
  'user A finds nothing of user B''s, and archived people are excluded'
);

select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
select is(
  array(select id::text from public.search_people('sail')),
  array['b0000000-0000-4000-8000-000000000001'],
  'user B finds only their own person'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.search_people('sail')$$,
  '42501',
  null,
  'anon cannot execute search_people'
);

select * from finish();
rollback;
