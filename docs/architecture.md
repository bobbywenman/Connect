# Architecture

How KnowThem is put together. Update this file when a ticket changes the structure or the data model.

## Stack

| Layer        | Choice                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| App          | React Native + Expo (latest stable SDK), TypeScript strict                                                        |
| Routing      | Expo Router (file-based; built on React Navigation)                                                               |
| Server state | TanStack Query                                                                                                    |
| Client state | Zustand (session, study deck, UI prefs)                                                                           |
| Forms        | react-hook-form + zod                                                                                             |
| Backend      | Supabase: Postgres, Auth, Storage, Edge Functions                                                                 |
| Device APIs  | expo-image-picker, expo-contacts, expo-notifications, expo-secure-store, expo-apple-authentication, expo-location |
| UI           | Own design system (`src/components`), FlashList, expo-image, Reanimated, Gesture Handler, react-native-svg        |
| Tests        | Jest + React Native Testing Library; pgTAP for the database                                                       |
| Builds       | EAS Build / Submit                                                                                                |

## Folder layout

```
src/
  app/            Routes (Expo Router). Thin: compose feature components, no data logic.
    (auth)/       Welcome (index), login, sign-up, forgot-password
    (app)/        Signed-in area: Stack over tabs
      (tabs)/     networks (home), search, study, events, settings
      network/[id], person/[id] (+ /edit), person/new, relationship/new (modal),
      study/session, study/complete, event/[id], onboarding
  components/     Design-system components (Button, Avatar, ...). No data fetching.
  features/       One folder per domain: networks, people, relationships, study, events, import, notifications, auth
    <feature>/
      api.ts        Supabase calls (the only place that talks to the database)
      hooks.ts      TanStack Query hooks wrapping api.ts
      components/   Feature-specific UI
      *.test.ts     Tests next to the code
  lib/            Supabase client, query client, query keys, shared utilities
  store/          Client state. Currently a session stub (session.ts) and the pure auth-gate rule (gate.ts); KT-06 replaces the stub
  constants/      Design tokens
  types/          database.ts (generated) and shared types
supabase/
  migrations/     SQL migrations (never edit an applied one; add a new one)
  tests/          pgTAP tests for security rules and functions
  functions/      Edge Functions (e.g., delete-account)
  seed.sql        Demo data for local development
docs/             Requirements, decisions, roadmap, setup guides
```

## Data model

All tables have `id uuid` primary keys (except join tables), `created_at`, and where editable `updated_at`. Every table carries `owner_id` (directly or through its parent) and Row Level Security allows access only when `owner_id = auth.uid()`.

```
profiles            id (= auth.users.id), display_name, onboarding_complete, settings jsonb
networks            id, owner_id, name, type (family|friends|work|custom), color, description
persons             id, owner_id, is_self, first_name, last_name, preferred_name, photo_path,
                    pronouns, birthdate, birthday_reminder, anniversary_date, anniversary_reminder,
                    location_city, location_lat, location_lng, job_title, company, department,
                    notes, tags text[], fun_facts, conversation_starters,
                    import_source (manual|contacts|linkedin), external_ids jsonb, archived_at
network_members     network_id, person_id, added_at                        (PK: network_id, person_id)
relationships       id, owner_id, source_person_id, target_person_id, type, inverse_type,
                    custom_label, notes                                    (unique: source, target, type)
custom_relationship_types  id, owner_id, label, inverse_label
events              id, owner_id, network_id (nullable), name, event_date, location, description
event_persons       event_id, person_id                                    (PK: both)
study_sessions      id, owner_id, deck_type, deck_params jsonb, started_at, ended_at
study_results       id, session_id, person_id, prompt_type, result (knew|sortof|didnt), response_time_ms
duplicate_dismissals owner_id, person_a_id, person_b_id
```

Key rules:

- **Many-to-many people ↔ networks** (D-1). Network person counts come from `network_members`.
- **One row per relationship** (D-7). To find someone's connections, query `source_person_id = X OR target_person_id = X`. Read `type` when X is the source and `inverse_type` when X is the target.
- **Self person** (D-2) is created by a trigger when an auth user is created, along with the profile row.
- **Photos** live in the private `avatars` bucket at `{owner_id}/{person_id}.jpg` and are shown through signed URLs.
- **Merges and other multi-step changes** run as Postgres functions so they happen in one transaction.

## Environments

| Environment | Supabase                       | Used for                                                                                            |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Local       | `npx supabase start` (Docker)  | Development, tests, CI                                                                              |
| Hosted      | Project `mpbmcgyknbpriwhanait` | Device testing, TestFlight, production (a separate production project may be created before launch) |

App config comes from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (never committed). The anon key is safe to ship in the app. The **service role key must never** be in the app or the repo.

## How we verify work

- **Automated:** lint, typecheck, unit/component tests, database tests. All run in CI on every PR.
- **Visual (cloud sessions):** Claude runs the web build and screenshots screens with Playwright.
- **Native (developer):** iOS simulator or device via a development build (`npx expo run:ios`) for animations, camera, contacts, notifications and Apple sign-in.
