# Decisions

Choices that change or clarify the original requirements in `docs/requirements/`. When a decision here conflicts with those documents, this file wins. Add new decisions at the bottom. Never renumber old ones.

## D-1 · A person can belong to many networks

**Decided:** 2026-11-06 by product owner

The requirements gave each person a single `networkId`. Instead, one person record represents one real human, linked to any number of networks through a `network_members` table. A cousin who is also a coworker is one profile shown in both networks.

- Relationships belong to people, not networks, so they show up in every network both people are in.
- Deleting a network removes memberships. People who are left with no network are deleted too, and the confirmation dialog says how many.
- Events can optionally be tied to a network but can include people from any network.

## D-2 · Every user has a "Me" person

**Decided:** 2026-11-06 by product owner

Each account gets a self person (`persons.is_self = true`), created automatically at sign-up. It lets users record relationships to themselves ("Sarah is my sister-in-law"), which the study prompt "How is X related to you?" needs. The self person shows as "You", appears in every network, and cannot be deleted.

## D-3 · Facebook and LinkedIn: file import, not APIs

**Decided:** 2026-11-06 by product owner

Facebook and LinkedIn no longer give regular apps access to a user's friends or connections. So:

- **LinkedIn:** import the `Connections.csv` file LinkedIn lets every user export (KT-32).
- **Facebook:** contact import dropped.
- **Login:** Email, Google and Apple only. Facebook and LinkedIn login are dropped from the MVP since they no longer serve import. They can be added later if users ask for them.

## D-4 · Build order: core loop first

**Decided:** 2026-11-06 by product owner

Milestones (see `docs/roadmap.md`):

- **M0 Foundation**
- **M1 Core Loop:** auth, networks, people, relationships, study
- **M2 Full MVP:** search, events, import, duplicates, graph, reminders
- **M3 Polish & Launch:** org chart, map, quality passes, App Store

Org chart and map view, listed as MVP in the PRD but P1 in the backlog, go in M3.

## D-5 · Work is tracked in GitHub Issues

**Decided:** 2026-11-06 by product owner

One issue per ticket (`KT-xx`), grouped under one epic issue per milestone. Each ticket gets its own branch and pull request. `docs/roadmap.md` is the index.

## D-6 · Expo Router instead of hand-written React Navigation

**Decided:** 2026-11-06 by engineering (can be revisited)

Expo Router is Expo's default and is built on React Navigation, so it still gives us tab and stack navigation. It also gives us deep links (needed for notification taps and password reset) with no extra code. Screens live in `src/app/` as files.

## D-7 · Relationships are stored once per pair

**Decided:** 2026-11-06 by engineering

The tickets suggested inserting two rows (one per direction). Instead each relationship is one row with `type` (from source's point of view) and `inverse_type` (from target's). Both people's screens read the same row. That way the two directions can never drift apart, and edits or deletes touch one row. Labels for either side come from the relationship-type module (KT-19).

## D-8 · Tooling

**Decided:** 2026-11-06 by engineering

- npm as the package manager
- Forms: react-hook-form + zod
- Lists: FlashList
- Images: expo-image
- Graph view: d3-force for layout, drawn with react-native-svg
- Tests: Jest + React Native Testing Library for the app, pgTAP via `supabase test db` for database security rules

## D-9 · Groups are tags

**Decided:** 2026-11-06 by engineering

The PRD lists both "tags" and "groups" on a person with no difference in behavior. For the MVP they are one thing, **tags**, shown in the UI as "Groups & tags". A separate groups concept can be added later if needed.

## D-10 · Notification IDs live on the device

**Decided:** 2026-11-06 by engineering

The tickets stored local notification IDs on the person record. Those IDs only mean something on the device that scheduled them, so they are kept in device storage. The app re-syncs all reminders on launch. The database only stores whether a reminder is on.

## D-11 · Password reset uses PKCE and a gate-exempt reset screen

**Decided:** 2026-11-06 by engineering (KT-08)

The Supabase client uses the PKCE flow, so reset emails land on `<redirectTo>?code=...` and the app exchanges the code on the device that asked for the reset. `src/features/auth/recoveryLink.ts` also accepts `token_hash` and implicit-token links. The `(auth)/reset-password` route is exempt from the auth gate's redirects (so a cold-start deep link is not bounced before it is processed), and the session store has a `recovery` flag that pins a recovery session to that screen until the new password is saved. The forgot-password screen always shows the same confirmation so it never reveals which emails have accounts.

## D-12 · People lists narrow relationships on the client (for now)

**Decided:** 2026-11-06 by engineering (KT-16)

`listNetworkPeople` loads the network's people, then all of the user's relationships (RLS-scoped), and keeps only those among the listed people in the app. This avoids long `in (...)` URLs. PostgREST returns at most 1,000 rows per request, so an account with more than ~1,000 relationships needs a SQL view or RPC instead; revisit in the performance pass (KT-42). Counts shown on network cards and the people list exclude "You".

## D-13 · Photos upload on Save, not on pick

**Decided:** 2026-11-06 by engineering (KT-15)

A picked photo is cropped square, resized to at most 500x500 and encoded as JPEG (0.8) on the device, then held locally until the person form is saved. After the person row exists, the photo is uploaded to `avatars/{owner_id}/{person_id}.jpg` (upsert) and `photo_path` is set. This avoids orphaned uploads on cancel and works the same for new and existing people. If only the photo step fails, the person is still saved and the user is told to retry. Signed URLs last 1 hour and are cached for 50 minutes; the disk-cache key is `{photo_path}?v={updated_at}` so a replaced photo (same path) refreshes.

## D-14 · Global search runs on the server, recent searches on the device

**Decided:** 2026-11-06 by engineering (KT-27)

Unlike the per-network list (D-12), global search covers every person, tag and note, so it is a SQL function, `search_people(q, max_results)` (security invoker, authenticated only). It matches names (prefix, substring, trigram similarity), tags, job title and notes, ignoring case and accents with `unaccent`, and ranks names above tags above job title above notes. Archived people are excluded; "You" is included. No extra index: `unaccent()` is only STABLE so it cannot back an expression index, and the search is already limited to one owner's rows (about 30 ms for 500 people locally). Revisit with an immutable unaccent wrapper plus trigram indexes if accounts grow into the many thousands. Queries under 2 characters are not sent and typing is debounced by 200 ms.

Recent searches (last 8) are stored on the device only, in the same chunked SecureStore wrapper as the auth session (localStorage on web), under a per-user key.

## D-15 · Archive, delete and the person menu (KT-17, KT-18)

**Decided:** 2026-11-06 by engineering

- Archiving sets `archived_at`; it is reversible ("Restore" in the banner on an archived person or in the menu) and needs no confirmation. Deleting is permanent (relationships and memberships cascade) and always asks first, saying how many relationships go too. The self person can be neither archived nor deleted (D-2): `archivePerson` and `deletePerson` filter on `is_self = false`, and the screen hides the menu.
- Archived people are hidden from network lists unless "Show archived" is on (then greyed with an "Archived" badge, still openable). They are not counted on network cards or in "N of M".
- "Remove from <network>" appears only when the detail screen was opened from that network (`?networkId=`). If it is the person's last network, the app warns and offers "Delete <name>" or "Remove anyway". The warning uses "them", since pronouns are free text.
- The "..." menu and the last-network warning use an in-app `ActionSheet` (the delete confirmation uses `ConfirmDialog`), not `Alert`, which does nothing on web. Switching between modals waits for the first to close on iOS.
- Relationship wording on the detail screen: badges are from the person's side ("Cousin of Maria", "Your parent" when the other end is You, as in the list); connection rows say what the connection is to this person ("Bob's child", "Your sister" on the self person's page).
