-- Local demo data. Runs on `npm run db:reset`. LOCAL ONLY: never run this
-- against the hosted project.
--
-- Demo login: demo@knowthem.app / password123
--
-- The signup trigger creates the profile and the self person ("Alex Wenman")
-- when the auth user is inserted.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_user uuid := '00000000-0000-4000-a000-000000000001';
  v_self uuid;
  v_family uuid := '00000000-0000-4000-b000-000000000001';
  v_work uuid := '00000000-0000-4000-b000-000000000002';

  -- Wenman Family
  v_robert uuid := '00000000-0000-4000-c000-000000000001'; -- dad
  v_linda uuid := '00000000-0000-4000-c000-000000000002';  -- mum
  v_emma uuid := '00000000-0000-4000-c000-000000000003';   -- sister
  v_daniel uuid := '00000000-0000-4000-c000-000000000004'; -- Emma's husband
  v_priya uuid := '00000000-0000-4000-c000-000000000005';  -- Alex's wife
  v_mark uuid := '00000000-0000-4000-c000-000000000006';   -- uncle (Robert's brother)
  v_jake uuid := '00000000-0000-4000-c000-000000000007';   -- cousin (Mark's son)
  v_lily uuid := '00000000-0000-4000-c000-000000000008';   -- niece (Emma's daughter)

  -- Work
  v_grace uuid := '00000000-0000-4000-d000-000000000001';  -- VP Engineering
  v_omar uuid := '00000000-0000-4000-d000-000000000002';   -- Alex's manager
  v_sofia uuid := '00000000-0000-4000-d000-000000000003';  -- Alex's report
  v_tom uuid := '00000000-0000-4000-d000-000000000004';    -- Alex's report
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
    'demo@knowthem.app', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{"name": "Alex Wenman"}', now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user, v_user::text, 'email',
    jsonb_build_object('sub', v_user::text, 'email', 'demo@knowthem.app', 'email_verified', true),
    now(), now(), now()
  );

  update public.profiles set onboarding_complete = true where id = v_user;

  select id into v_self from public.persons where owner_id = v_user and is_self;

  update public.persons
     set birthdate = '1990-04-12', job_title = 'Engineering Lead', company = 'Brightline',
         department = 'Engineering', location_city = 'Portland, OR'
   where id = v_self;

  insert into public.networks (id, owner_id, name, type, color, description) values
    (v_family, v_user, 'Wenman Family', 'family', 'orange', 'Both sides of the family'),
    (v_work, v_user, 'Work', 'work', 'blue', 'Brightline engineering');

  insert into public.persons (
    id, owner_id, first_name, last_name, preferred_name, pronouns, birthdate,
    birthday_reminder, anniversary_date, location_city, job_title, company,
    tags, fun_facts, conversation_starters, notes
  ) values
    (v_robert, v_user, 'Robert', 'Wenman', 'Bob', 'he/him', '1958-09-03', true, '1984-06-16',
      'Bend, OR', 'Retired teacher', null, '{parents,golf}',
      'Taught high-school chemistry for 35 years.', 'Ask about his golf handicap.', null),
    (v_linda, v_user, 'Linda', 'Wenman', null, 'she/her', '1960-02-21', true, '1984-06-16',
      'Bend, OR', 'Nurse', 'St. Charles Medical', '{parents,gardening}',
      'Grows prize-winning tomatoes.', 'Ask what she is planting this season.', null),
    (v_emma, v_user, 'Emma', 'Okafor', null, 'she/her', '1987-11-30', true, '2014-08-09',
      'Seattle, WA', 'Architect', 'Okafor & Lee', '{siblings}',
      'Ran the Chicago marathon in 2019.', null, 'Maiden name Wenman.'),
    (v_daniel, v_user, 'Daniel', 'Okafor', 'Dan', 'he/him', '1985-05-14', false, '2014-08-09',
      'Seattle, WA', 'Product designer', 'Northwind', '{in-laws,cycling}',
      'Builds his own bikes.', 'Ask about his latest bike build.', null),
    (v_priya, v_user, 'Priya', 'Wenman', null, 'she/her', '1991-07-22', true, '2018-10-06',
      'Portland, OR', 'Pediatrician', 'OHSU', '{spouse}',
      'Speaks four languages.', null, null),
    (v_mark, v_user, 'Mark', 'Wenman', null, 'he/him', '1962-01-08', false, null,
      'Boise, ID', 'Contractor', 'Wenman Builders', '{uncles-aunts}',
      'Built his own cabin.', null, null),
    (v_jake, v_user, 'Jake', 'Wenman', null, 'he/him', '1993-03-17', false, null,
      'Boise, ID', 'Firefighter', 'Boise Fire Dept.', '{cousins,climbing}',
      null, 'Ask about his last climbing trip.', null),
    (v_lily, v_user, 'Lily', 'Okafor', null, 'she/her', '2016-12-02', true, null,
      'Seattle, WA', null, null, '{kids}',
      'Loves dinosaurs.', 'Ask about her favourite dinosaur.', null),
    (v_grace, v_user, 'Grace', 'Liu', null, 'she/her', '1978-04-05', false, null,
      'Portland, OR', 'VP Engineering', 'Brightline', '{leadership}', null, null, null),
    (v_omar, v_user, 'Omar', 'Haddad', null, 'he/him', '1983-08-19', false, null,
      'Portland, OR', 'Director of Engineering', 'Brightline', '{leadership}',
      'Former professional chess player.', null, null),
    (v_sofia, v_user, 'Sofia', 'Marquez', null, 'she/her', '1995-10-10', false, null,
      'Portland, OR', 'Senior Engineer', 'Brightline', '{team,mobile}', null, null, null),
    (v_tom, v_user, 'Tom', 'Becker', 'Tommy', 'he/him', '1997-01-25', false, null,
      'Remote', 'Engineer', 'Brightline', '{team,backend}', null, null, 'Joined in March.');

  update public.persons set department = 'Engineering'
   where id in (v_grace, v_omar, v_sofia, v_tom);

  insert into public.network_members (owner_id, network_id, person_id) values
    (v_user, v_family, v_robert),
    (v_user, v_family, v_linda),
    (v_user, v_family, v_emma),
    (v_user, v_family, v_daniel),
    (v_user, v_family, v_priya),
    (v_user, v_family, v_mark),
    (v_user, v_family, v_jake),
    (v_user, v_family, v_lily),
    (v_user, v_work, v_grace),
    (v_user, v_work, v_omar),
    (v_user, v_work, v_sofia),
    (v_user, v_work, v_tom);

  -- One row per pair (D-7): type = what source is to target.
  insert into public.relationships (owner_id, source_person_id, target_person_id, type, inverse_type) values
    -- family, including the self person
    (v_user, v_robert, v_self, 'parent', 'child'),
    (v_user, v_linda, v_self, 'parent', 'child'),
    (v_user, v_robert, v_emma, 'parent', 'child'),
    (v_user, v_linda, v_emma, 'parent', 'child'),
    (v_user, v_robert, v_linda, 'spouse', 'spouse'),
    (v_user, v_emma, v_self, 'sibling', 'sibling'),
    (v_user, v_priya, v_self, 'spouse', 'spouse'),
    (v_user, v_daniel, v_emma, 'spouse', 'spouse'),
    (v_user, v_emma, v_lily, 'parent', 'child'),
    (v_user, v_daniel, v_lily, 'parent', 'child'),
    (v_user, v_mark, v_robert, 'sibling', 'sibling'),
    (v_user, v_mark, v_jake, 'parent', 'child'),
    (v_user, v_mark, v_self, 'aunt_uncle', 'niece_nephew'),
    (v_user, v_jake, v_self, 'cousin', 'cousin'),
    (v_user, v_jake, v_emma, 'cousin', 'cousin'),
    (v_user, v_self, v_lily, 'aunt_uncle', 'niece_nephew'),
    -- work: Grace -> Omar -> Alex -> Sofia, Tom
    (v_user, v_grace, v_omar, 'manager', 'direct_report'),
    (v_user, v_omar, v_self, 'manager', 'direct_report'),
    (v_user, v_self, v_sofia, 'manager', 'direct_report'),
    (v_user, v_self, v_tom, 'manager', 'direct_report'),
    (v_user, v_sofia, v_tom, 'coworker', 'coworker');

  insert into public.events (owner_id, network_id, name, event_date, location, description)
  values (v_user, v_family, 'Thanksgiving at Mum and Dad''s', '2026-11-26', 'Bend, OR', null);

  insert into public.event_persons (owner_id, event_id, person_id)
  select v_user, e.id, p.id
    from public.events e
   cross join unnest(array[v_robert, v_linda, v_emma, v_daniel, v_priya, v_lily]) as p(id)
   where e.owner_id = v_user;
end;
$$;
