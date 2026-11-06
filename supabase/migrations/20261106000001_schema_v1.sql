-- KT-05: schema v1.
--
-- Data model: see docs/architecture.md (data model) and docs/decisions.md
-- (D-1 people in many networks, D-2 self person, D-7 one row per
-- relationship, D-9 groups are tags, D-10 notification ids stay on device).
--
-- Ownership and cross-owner integrity
-- -----------------------------------
-- Every user-owned table carries owner_id (default auth.uid()), including the
-- join tables. Parent tables expose a unique (owner_id, id) key, and every
-- child points at its parents with a COMPOSITE foreign key
-- (owner_id, parent_id) -> parent (owner_id, id). That makes it impossible,
-- by declaration rather than by trigger code, to link rows that belong to two
-- different users: a network_members row can only join a network and a person
-- with the same owner, and a relationship's two people must share its owner.
-- Foreign key checks run without RLS, so this holds even for privileged
-- callers, and RLS (owner_id = auth.uid()) then stops a user from writing a
-- row whose owner_id is someone else's.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared trigger function: keep updated_at current on every UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by the signup trigger.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  onboarding_complete boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- networks
-- ---------------------------------------------------------------------------
create table public.networks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  type text not null check (type in ('family', 'friends', 'work', 'custom')),
  color text check (char_length(color) <= 32),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- target of composite foreign keys (see header); also serves "networks by owner"
  unique (owner_id, id)
);

-- ---------------------------------------------------------------------------
-- persons: one row per real human (D-1). Exactly one is_self row per owner (D-2).
-- ---------------------------------------------------------------------------
create table public.persons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  is_self boolean not null default false,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text check (char_length(last_name) <= 100),
  preferred_name text check (char_length(preferred_name) <= 100),
  photo_path text check (char_length(photo_path) <= 500),
  pronouns text check (char_length(pronouns) <= 50),
  birthdate date,
  birthday_reminder boolean not null default false,
  anniversary_date date,
  anniversary_reminder boolean not null default false,
  location_city text check (char_length(location_city) <= 200),
  location_lat double precision check (location_lat between -90 and 90),
  location_lng double precision check (location_lng between -180 and 180),
  job_title text check (char_length(job_title) <= 200),
  company text check (char_length(company) <= 200),
  department text check (char_length(department) <= 200),
  notes text,
  tags text[] not null default '{}',
  fun_facts text,
  conversation_starters text,
  import_source text not null default 'manual'
    check (import_source in ('manual', 'contacts', 'linkedin')),
  external_ids jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- target of composite foreign keys (see header). Its index (owner_id, id)
  -- also serves "persons by owner" lookups, so no separate owner index.
  unique (owner_id, id)
);

-- At most one self person per owner.
create unique index persons_one_self_per_owner
  on public.persons (owner_id)
  where is_self;

-- Name search (KT search tickets): trigram indexes for ILIKE / similarity.
create index persons_first_name_trgm_idx
  on public.persons using gin (first_name extensions.gin_trgm_ops);
create index persons_last_name_trgm_idx
  on public.persons using gin (last_name extensions.gin_trgm_ops);
create index persons_preferred_name_trgm_idx
  on public.persons using gin (preferred_name extensions.gin_trgm_ops);

-- is_self is set only by the signup trigger and can never change afterwards.
create or replace function public.persons_guard_is_self()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_self is distinct from old.is_self then
    raise exception 'is_self cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger persons_guard_is_self
  before update of is_self on public.persons
  for each row execute function public.persons_guard_is_self();

-- ---------------------------------------------------------------------------
-- network_members: people <-> networks, many to many (D-1).
-- The self person is shown in every network by the app (D-2); it does not
-- need membership rows.
-- ---------------------------------------------------------------------------
create table public.network_members (
  network_id uuid not null,
  person_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (network_id, person_id),
  foreign key (owner_id, network_id)
    references public.networks (owner_id, id) on delete cascade,
  foreign key (owner_id, person_id)
    references public.persons (owner_id, id) on delete cascade
);

create index network_members_person_id_idx on public.network_members (owner_id, person_id);

-- ---------------------------------------------------------------------------
-- relationships: ONE row per pair (D-7).
-- type         = what the source is to the target  (source "parent" of target)
-- inverse_type = what the target is to the source  (target "child" of source)
-- Type keys come from the relationship-type module (KT-19), or a custom type.
-- ---------------------------------------------------------------------------
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_person_id uuid not null,
  target_person_id uuid not null,
  type text not null check (char_length(btrim(type)) between 1 and 50),
  inverse_type text not null check (char_length(btrim(inverse_type)) between 1 and 50),
  custom_label text check (char_length(custom_label) <= 50),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_person_id <> target_person_id),
  unique (source_person_id, target_person_id, type),
  foreign key (owner_id, source_person_id)
    references public.persons (owner_id, id) on delete cascade,
  foreign key (owner_id, target_person_id)
    references public.persons (owner_id, id) on delete cascade
);

-- The unique (source, target, type) index serves lookups by source.
create index relationships_source_person_id_idx on public.relationships (owner_id, source_person_id);
create index relationships_target_person_id_idx on public.relationships (owner_id, target_person_id);

-- ---------------------------------------------------------------------------
-- custom_relationship_types: user-defined labels and their inverse.
-- ---------------------------------------------------------------------------
create table public.custom_relationship_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 50),
  inverse_label text not null check (char_length(btrim(inverse_label)) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index custom_relationship_types_owner_label_key
  on public.custom_relationship_types (owner_id, lower(label));

-- ---------------------------------------------------------------------------
-- events: optionally tied to a network, can include anyone (D-1).
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  network_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  event_date date,
  location text check (char_length(location) <= 200),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- also serves "events by owner"
  unique (owner_id, id),
  -- Deleting the network keeps the event; only network_id is cleared
  -- (PG 15+ column list), owner_id stays.
  foreign key (owner_id, network_id)
    references public.networks (owner_id, id) on delete set null (network_id)
);

create index events_owner_id_event_date_idx on public.events (owner_id, event_date);
create index events_network_id_idx on public.events (owner_id, network_id);

create table public.event_persons (
  event_id uuid not null,
  person_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, person_id),
  foreign key (owner_id, event_id)
    references public.events (owner_id, id) on delete cascade,
  foreign key (owner_id, person_id)
    references public.persons (owner_id, id) on delete cascade
);

create index event_persons_person_id_idx on public.event_persons (owner_id, person_id);

-- ---------------------------------------------------------------------------
-- study_sessions / study_results
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deck_type text not null check (char_length(btrim(deck_type)) between 1 and 50),
  deck_params jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id),
  check (ended_at is null or ended_at >= started_at)
);

create table public.study_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  person_id uuid not null,
  prompt_type text not null check (char_length(btrim(prompt_type)) between 1 and 50),
  result text not null check (result in ('knew', 'sortof', 'didnt')),
  response_time_ms integer check (response_time_ms >= 0),
  created_at timestamptz not null default now(),
  foreign key (owner_id, session_id)
    references public.study_sessions (owner_id, id) on delete cascade,
  foreign key (owner_id, person_id)
    references public.persons (owner_id, id) on delete cascade
);

create index study_results_session_id_idx on public.study_results (owner_id, session_id);
create index study_results_person_id_idx on public.study_results (owner_id, person_id);

-- ---------------------------------------------------------------------------
-- duplicate_dismissals: "these two are not the same person". Stored once per
-- pair with person_a_id < person_b_id.
-- ---------------------------------------------------------------------------
create table public.duplicate_dismissals (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_a_id uuid not null,
  person_b_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, person_a_id, person_b_id),
  check (person_a_id < person_b_id),
  foreign key (owner_id, person_a_id)
    references public.persons (owner_id, id) on delete cascade,
  foreign key (owner_id, person_b_id)
    references public.persons (owner_id, id) on delete cascade
);

create index duplicate_dismissals_person_b_id_idx on public.duplicate_dismissals (owner_id, person_b_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.networks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.persons
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.relationships
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.custom_relationship_types
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.study_sessions
  for each row execute function public.set_updated_at();
