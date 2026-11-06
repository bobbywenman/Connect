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
