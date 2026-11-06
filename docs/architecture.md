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
    (auth)/       Welcome (index), login, sign-up, forgot-password, reset-password (handles the emailed link; exempt from the gate redirect)
    (app)/        Signed-in area: Stack over tabs
      (tabs)/     networks (home), search, study, events, settings
      network/[id], person/[id] (+ /edit), person/new, relationship/new (modal), me (own profile),
      study/session, study/complete, event/[id], onboarding
  components/     Design-system components (Button, Avatar, ...). No data fetching.
  features/       One folder per domain: networks, people, relationships, study, events, import, notifications, auth
    <feature>/
      api.ts        Supabase calls (the only place that talks to the database)
      hooks.ts      TanStack Query hooks wrapping api.ts
      components/   Feature-specific UI
      *.test.ts     Tests next to the code
  lib/            supabase.ts (typed client), secureStorage.ts (chunked session storage), queryClient.ts, queryKeys.ts
  store/          Client state. Zustand stores: session.ts (mirrors Supabase auth), uiPrefs.ts, and the pure auth-gate rule (gate.ts)
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

All tables have `id uuid` primary keys (except join tables), `created_at`, and where editable `updated_at` (kept current by the shared `set_updated_at()` trigger). Every user-owned table, join tables included, carries `owner_id` (default `auth.uid()`, cascades from `auth.users`), and Row Level Security allows each command only when `owner_id = auth.uid()` (`profiles` uses `id`). The `anon` role has no access to anything in `public`. Schema lives in `supabase/migrations/`; generated types in `src/types/database.ts`.

```
profiles            id (= auth.users.id), display_name, onboarding_complete, settings jsonb
networks            id, owner_id, name (<= 50), type (family|friends|work|custom), color, description
persons             id, owner_id, is_self, first_name, last_name, preferred_name, photo_path,
                    pronouns, birthdate, birthday_reminder, anniversary_date, anniversary_reminder,
                    location_city, location_lat, location_lng, job_title, company, department,
                    notes, tags text[], fun_facts, conversation_starters,
                    import_source (manual|contacts|linkedin), external_ids jsonb, archived_at
network_members     network_id, person_id, owner_id, added_at              (PK: network_id, person_id)
relationships       id, owner_id, source_person_id, target_person_id, type, inverse_type,
                    custom_label, inverse_custom_label, notes                                    (unique: source, target, type)
custom_relationship_types  id, owner_id, label, inverse_label             (unique per owner: lower(label))
events              id, owner_id, network_id (nullable), name, event_date, location, description
event_persons       event_id, person_id, owner_id                          (PK: event_id, person_id)
study_sessions      id, owner_id, deck_type, deck_params jsonb, started_at, ended_at
study_results       id, owner_id, session_id, person_id, prompt_type, result (knew|sortof|didnt),
                    response_time_ms
duplicate_dismissals owner_id, person_a_id, person_b_id                    (PK: all three; a < b)
```

Key rules:

- **Many-to-many people ↔ networks** (D-1). Network person counts come from the `networks_with_counts` view (security invoker, so RLS applies), which counts `network_members` rows excluding archived people and the self person. Deleting a network goes through `delete_network(network_id)`, which also deletes people left in no network and returns how many. The delete confirmation previews that number with `count_people_only_in_network(network_id)` (same rule, read-only, security invoker).
- **One row per relationship** (D-7). `type` is what the source is to the target ("parent"), `inverse_type` what the target is to the source ("child"). To find someone's connections, query `source_person_id = X OR target_person_id = X`. Read `type` when X is the source and `inverse_type` when X is the target.
- **Self person** (D-2) is created by a trigger when an auth user is created, along with the profile row. At most one per owner, `is_self` can't be changed, and RLS doesn't let it be deleted. The app shows it in every network; it needs no `network_members` rows.
- **No cross-user links.** Parents expose a unique `(owner_id, id)`, and children reference them with composite foreign keys `(owner_id, parent_id)`, so a membership, relationship, event attendee, study result or dismissal can only link rows of the same owner.
- **Cascades.** Deleting a person removes their memberships, relationships, event attendance, study results and dismissals. Deleting a network removes its memberships; its events keep existing with `network_id` cleared.
- **Search.** Trigram (`pg_trgm`) indexes on `first_name`, `last_name` and `preferred_name`.
- **Photos** live in the private `avatars` bucket at `{owner_id}/{person_id}.jpg` and are shown through signed URLs. Storage policies only allow objects under the caller's own `{auth.uid()}/` folder.
- **Merges and other multi-step changes** run as Postgres functions so they happen in one transaction.

## Environments

| Environment | Supabase                       | Used for                                                                                            |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Local       | `npx supabase start` (Docker)  | Development, tests, CI                                                                              |
| Hosted      | Project `mpbmcgyknbpriwhanait` | Device testing, TestFlight, production (a separate production project may be created before launch) |

App config comes from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) in `.env` (never committed). The publishable key is safe to ship in the app. The **secret / service role key must never** be in the app or the repo.

## Data layer

- **Client:** `src/lib/supabase.ts` creates the typed client (`createClient<Database>`) from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and throws a clear error at startup if either is missing. Auto token refresh starts and stops with the app's foreground/background state (native only).
- **Session persistence:** `src/lib/secureStorage.ts` stores the auth session in expo-secure-store on native, split into 500-character chunks (`key.0..n` plus `key.count`) because SecureStore values are limited to about 2KB; stale chunks are removed on overwrite and remove. On web it uses `localStorage`.
- **Server state:** TanStack Query (`src/lib/queryClient.ts`: 30s stale time, one retry for queries, none for mutations; app foreground counts as focus). Keys are built from `src/lib/queryKeys.ts`. Online status is not wired yet because no netinfo package is installed.
- **Client state:** `src/store/session.ts` (`status: loading | signedOut | signedIn`, `session`, `userId`, `onboardingComplete`) subscribes to `supabase.auth.onAuthStateChange` via `initSession()` (called once in the root layout) and reads `profiles.onboarding_complete` after sign-in. `getGateRedirect` (`gate.ts`) never redirects while `loading`; the root layout shows a blank screen until then.
- **Feature pattern:** `src/features/<feature>/api.ts` (plain async Supabase calls, throw on error) and `hooks.ts` (useQuery / useMutation). See `src/features/profile/` for the example.
- **Auth (KT-07):** `src/features/auth/` holds `api.ts` (signUp/signIn/signOut), `hooks.ts` (mutations), `schemas.ts` (zod schemas used with react-hook-form), `errors.ts` (`mapAuthError`, Supabase errors to plain-language messages) and shared form pieces (`AuthLayout`, `FormTextField`, `FormError`). Screens never read the sign-in result: success arrives through `onAuthStateChange`, and the route gate moves the user. If the project requires email confirmation, sign-up returns no session and the screen shows "Check your email to confirm".
- **People list (KT-16):** `network/[id]` renders `features/people/components/NetworkPeopleScreen`. `listNetworkPeople(networkId)` runs three parallel queries (network members, the self person who belongs to every network without a membership row, and the user's relationships narrowed to pairs inside the list), cached under `['persons', { networkId }]`. Sorting, row labels (`primaryLabel`: "Your cousin", else "Cousin of Maria", else job title) and search/filter (`filterPeople`) are pure functions in `features/people/listing.ts`; search and filters run on the device with no network calls. Rows are virtualised with FlashList, so jest loads `@shopify/flash-list/jestSetup` and transforms the package (`transformIgnorePatterns` in `package.json`).
- **Events (KT-29):** `src/features/events/` follows the feature pattern. `listEvents` reads `events` with an embedded `event_persons(count)` (one query); `getEvent` embeds the attendees' basic person fields. The Events tab (`EventsHome`) splits the list with the pure `groupEvents(events, today)` (`grouping.ts`; today counts as upcoming), and `dates.ts` holds `formatEventDate` ("Sat, Dec 20") and `formatRelativeDay` ("in 6 days", "3 weeks ago"). Routes: `event/new` and `event/[id]/edit` are modals sharing `EventFormScreen`; `event/[id]` is the detail. The form requires name and date (the column is nullable, so undated rows still list, last under Upcoming). Attendees (KT-30): `event/[id]/attendees` is a modal picker (`AttendeePickerScreen`) listing every non-archived person (`listAllPeopleForPicker`, networks embedded; You included) with instant accent-insensitive search, network filter chips and Select all in view / Clear, driven by the pure helpers in `attendeePicker.ts`. Save calls `setEventAttendees(eventId, personIds)`, which diffs against the current `event_persons` rows and only inserts or deletes the difference (idempotent), then invalidates `events`. The study button's session comes with KT-22.
- **Global search (KT-27):** the Search tab renders `features/search/components/SearchScreen`. `searchPeople(query)` calls the `search_people` SQL function (migration `20261106000009`), which returns ranked people with their networks and the matched field; `useSearchPeople` debounces by 200 ms, skips queries under 2 characters and keeps the previous results while loading (`['search', query]`). Recent searches live in a zustand store persisted through `lib/secureStorage` (`features/search/recent.ts`). See D-14.
- **Tests:** `jest.setup.ts` mocks `@/lib/supabase` with `src/lib/__mocks__/supabase.ts` so unit tests never hit the network; control it with `fakeSupabase` from `@/test-utils/fakeSupabase`.

## How we verify work

- **Automated:** lint, typecheck, unit/component tests, database tests. All run in CI on every PR.
- **Visual (cloud sessions):** Claude runs the web build and screenshots screens with Playwright.
- **Native (developer):** iOS simulator or device via a development build (`npx expo run:ios`) for animations, camera, contacts, notifications and Apple sign-in.
- **Person detail (KT-17/18):** `person/[id]` renders `features/people/components/PersonDetailScreen`. `getPersonDetail(id)` runs the person, their networks and their relationships (`or` filter) in parallel, then the other people in one `in (...)` query, cached under `['person', id, 'full']`. Date maths (`daysUntilNext`, Feb 29 on Feb 28 in non-leap years) is in `features/people/dates.ts`; wording and section helpers are in `features/people/detail.ts`. Archive, restore, delete and remove-from-network are in `features/people/api.ts` with matching hooks that refresh lists, counts and the person.
