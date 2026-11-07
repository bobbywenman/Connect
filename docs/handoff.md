# Handoff: KnowThem build status (2026-11-06)

For the next Claude session, running on the developer's Mac. Read this first, then `CLAUDE.md`, `docs/decisions.md` and `docs/architecture.md`.

## Your two goals

1. **Help the developer test on their iPhone through Xcode** and fix what they find.
2. **Continue the build** from where the cloud session stopped (see "What's left").

## Where things stand

- Repo: `bobbywenman/Connect`, default branch `main`. Everything finished is merged to `main`; CI (GitHub Actions: lint, typecheck, test, format) is green on `main`.
- On `main`: ~680 Jest tests, 143+ pgTAP database tests, all passing.
- Work is tracked as GitHub issues `KT-xx` (#5–#48) under 4 milestone epics (#1–#4). `docs/roadmap.md` maps ticket IDs to issue numbers (they are not always ID+4: KT-22 is #26, KT-23 is #29, KT-24 is #27, KT-25 is #28).
- The cloud session merged directly into `main` (no PRs) because the user asked it to; merge commits say `Closes #N`, which closed the issues. Keep that workflow unless the user says otherwise.

### Done (merged, issues closed)

| Ticket              | What it gives you                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| KT-01..06 (M0)      | Expo SDK 58 app, CI, design system, Expo Router nav + auth gate, Supabase schema/RLS/storage/seed, data layer (supabase-js, TanStack Query, zustand) |
| KT-07, KT-08        | Email sign up / log in / sign out; forgot + reset password (PKCE, `knowthem://reset-password`)                                                       |
| KT-11               | "Me" self person, Settings → My profile                                                                                                              |
| KT-12, KT-13        | Home network list (color cards, counts); create/edit/delete networks                                                                                 |
| KT-14, KT-15        | Person form (progressive sections, many networks per person); profile photos (camera/library, private bucket, signed URLs)                           |
| KT-16               | People list per network (A–Z, You pinned, instant search, tag/relationship filters, FlashList)                                                       |
| KT-17, KT-18        | Person detail screen; archive / restore / delete / remove from network; "Show archived"                                                              |
| KT-19               | Relationship type catalog, inverse rules, label helpers, saved custom labels                                                                         |
| KT-27               | Global search (`search_people` SQL function, ~30 ms at 500 people)                                                                                   |
| KT-29, KT-30 part 1 | Events list/detail/form; attendee picker. **#34 stays open** for part 2                                                                              |
| KT-33               | Duplicate detection (warning on save, Settings → Possible duplicates)                                                                                |
| KT-36, KT-37        | Birthday/anniversary local reminders; Settings → Notifications (lead time, hour, toggles)                                                            |

### In progress (branches pushed, NOT merged; agents stopped at a usage limit)

Each branch ends with a `WIP` commit. Check out the branch, read the diff, finish, run all checks, merge into `main` with `Closes #N`.

| Branch                  | Ticket                                                                              | State when stopped                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kt-20-relationships`   | KT-20 + KT-21 (#24, #25): add-relationship 3-step flow, badge menu to change/remove | Code written incl. tests files; typecheck passed; lint + new tests NOT yet run; e2e screenshots taken. Based on an older `main`: merge `origin/main` in first. **Highest priority**: study mode needs it. |
| `kt-28-new-this-month`  | KT-28 (#32): "New this month" home section + see-all screen                         | Code + tests written; final checks not confirmed                                                                                                                                                          |
| `kt-31-contacts-import` | KT-31 (#35): import from phone contacts (`src/features/import/`)                    | Partial: core logic files were being written; nothing verified. Design notes: keep the candidates → review → import pipeline source-agnostic so KT-32 (LinkedIn CSV) reuses it.                           |

## What's left (suggested order)

1. **Hosted Supabase setup** (needed before testing on a phone against the real backend), see "Phone testing" below.
2. **Device test pass** of current `main`; fix bugs (list of things never checked on a device is below).
3. Finish **KT-20/21**, then **KT-28**, **KT-31**.
4. **Study mode**: KT-22 deck builder (#26) → KT-23 flashcards with Reanimated flip (#29) → KT-24 session complete (#27). Then **KT-30 part 2** (event-scoped deck, #34), **KT-26** study history (#30).
5. **KT-25 onboarding** (#28): reuses PersonForm, the relationship flow and the study deck.
6. **KT-09 Google** (#13) and **KT-10 Apple** sign-in (#14): blocked on the user creating a Google Cloud OAuth client and a paid Apple Developer account. Ask before starting.
7. M2 remainder: KT-32 LinkedIn CSV (#36), KT-34 merge profiles (#38; a `/merge?a=&b=` placeholder route exists), KT-35 graph view (#39).
8. M3: org chart, map, polish passes, account deletion (App Store requirement), EAS/TestFlight (#42–#48).

Small cleanups noticed along the way:

- Jest prints "A worker process has failed to exit gracefully" (tests pass). Find the leaking timer with `--detectOpenHandles`.
- Catalog labels read "Your niece / nephew", "Your aunt / uncle". Consider gendered or nicer wording.
- Epic issues #2–#4 have hand-written checklists; tick them or switch to sub-issues.
- Issue #10 (KT-06) text still says "anon key"; the project uses the publishable key.
- Dev-only buttons to remove or keep behind `__DEV__` before release: "Use demo account (dev)" (welcome), "Finish onboarding (dev)" (onboarding placeholder until KT-25), "Test reminder in 1 minute" (Settings).
- Monthly "new people" summary notification: the setting is stored (`settings.reminders.monthlySummary`) but nothing schedules it yet.

## Phone testing (the developer's main ask)

The developer has a Mac with Xcode and an iPhone. Their local folder is `/Users/bobby/Documents/Dark House/Connect` and has a `.env` (never commit it).

### One-time backend setup (hosted project `mpbmcgyknbpriwhanait`)

1. `.env` needs `EXPO_PUBLIC_SUPABASE_URL=https://mpbmcgyknbpriwhanait.supabase.co` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (see `.env.example`).
2. **Done 2026-11-06.** The repo is linked and migrations `…000001`–`…000009` are applied to the hosted project (named "Roots" in the dashboard). Its old prototype schema was wiped first with `db reset --remote --no-seed`. An empty leftover `person-photos` storage bucket from the prototype remains; the app only uses `avatars`. To apply new migrations later:
   - `npx supabase db push --remote` (Supabase CLI 3.x targets the **local** stack unless you pass `--remote`; the CLI uses your logged-in account, no database password needed)
   - Never run `db reset --remote` again now that real data may exist. The seed/demo user is local-only.
3. Dashboard → Authentication → URL Configuration → add redirect URL `knowthem://**`.
4. For easy testing: Authentication → Providers → Email → turn **Confirm email** off (turn it back on before launch, KT-44).
5. The demo login (`demo@knowthem.app` / `password123`) and the "Use demo account (dev)" button only work against **local** Supabase. On the hosted project, sign up with a real email.

Alternative: run local Supabase on the Mac (`npm run db:start`, needs Docker) and point `.env` at the Mac's **LAN IP** (not 127.0.0.1) so the phone can reach it.

### Build and run

```bash
git pull origin main
npm install
npx expo prebuild --platform ios        # re-run whenever native packages change
open ios/*.xcworkspace
```

In Xcode: KnowThem target → Signing & Capabilities → Team = the user's Apple ID (free account works for device testing; builds expire after 7 days). Phone: Settings → Privacy & Security → Developer Mode on; after first install, Settings → General → VPN & Device Management → trust the developer. Pick the phone and Run. The debug build loads JS from Metro: if needed run `npx expo start` and keep phone + Mac on the same Wi-Fi. Shortcut: `npx expo run:ios --device`.

Bundle ID is `com.bobbywenman.knowthem` (set in `app.json`). Ask the user before changing it.

### Never verified on a real device (test these)

- Session restore after a cold app restart (SecureStore chunked storage); token refresh on foreground.
- Keyboard handling on all forms; iOS password/email autofill.
- Native date picker (person form, event form) incl. the Clear action.
- Camera + photo library permission prompts, square crop, HEIC → JPEG, upload from `file://`.
- Notifications: permission prompt appears only when turning on a "Remind me" switch; "Test reminder in 1 minute" fires; tapping opens the person (warm and cold start); turning off/deleting cancels.
- Password reset email link opening the app via `knowthem://reset-password?code=...` (PKCE needs the same device that requested it).
- Modals/action sheets (network create, relationship flow, ConfirmDialog, ActionSheet; iOS modal-to-modal handoff uses a 400 ms delay), pull to refresh, FlashList scrolling, VoiceOver labels, Dynamic Type at large sizes, card/FAB shadows.

## Learnings and gotchas

**Tooling**

- Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6. Check SDK 58 docs, not memory (`AGENTS.md`).
- Add packages with `npx expo install <pkg>`. For dev deps: `npx expo install <pkg> -- --save-dev` (flag after `--`), otherwise they land in `dependencies`.
- TypeScript 6: `baseUrl` is deprecated; `paths` use `./src/*`; `types: ["jest", "node"]` must be explicit.
- React Native Testing Library v14: `await render(...)`; needs the `test-renderer` package.
- `npm run lint` uses `--no-cache`. A stale cache in `.expo/cache/eslint` once hid a real failure. Stale typed routes in `.expo/types` can cause bogus typecheck errors: `rm -rf .expo/types`.
- Jest crash mentioning `react-native-worklets ... loadUnpackersWithCode`: caused by inline style objects inside `.map()` callbacks; extract a small component.
- `Alert.alert` doesn't work on web. Use the shared `ConfirmDialog` / `ActionSheet` components.
- Metro sometimes serves a stale bundle after edits: restart with `npx expo start --clear`.

**Supabase**

- Publishable keys (`sb_publishable_...`) replace the legacy anon key. Client uses PKCE (`src/lib/supabase.ts`).
- Migrations are numbered `20261106000001`…`20261106000009`; the next is `…000010`. Never edit an applied migration; add a new one with RLS and a pgTAP test, then `npm run db:types`.
- `supabase/tests/00_schema_security_test.sql` has a hard-coded allowlist of callable functions: add new RPCs there.
- `npx supabase db reset` sometimes fails with a Docker container error: stop, start and retry.
- PostgREST returns at most 1,000 rows per request (see D-12; affects accounts with >1,000 relationships).
- Every row has `owner_id`; cross-owner links are blocked by composite foreign keys `(owner_id, id)`. The self person (`is_self`) is in every network implicitly (no membership rows), cannot be deleted or archived.

**Code layout** (details in `docs/architecture.md`)

- Screens in `src/app/` are thin; logic in `src/features/<feature>/` (`api.ts` = only place that touches Supabase, `hooks.ts` = TanStack Query, pure helpers with tests, `components/`).
- Test fakes: `jest.setup.ts` mocks `@/lib/supabase` and `expo-notifications`; fakes live in `src/lib/__mocks__/supabase.ts`, `src/test-utils/fakeSupabase.ts` and `src/test-utils/fakePeople.ts`. Parallel branches often conflict in these and in `queryKeys.ts`, `src/app/(app)/_layout.tsx`, `docs/decisions.md` (D-number collisions): resolve by keeping both sides and renumbering decisions.
- Decisions D-1…D-17 are recorded. Key ones: D-1 people in many networks, D-2 "Me" person, D-3 LinkedIn by CSV and no Facebook, D-7 one relationship row per pair, D-10/D-16 reminders scheduled on device.

**Working with parallel agents (cloud session)**

- Running 4–5 agents at once worked well when their files didn't overlap. Downsides: they share one local Supabase (resets knock each other over), worktrees eat disk (~1 GB each), and usage limits stop them mid-task.
- Model choice that worked: Haiku for small, well-specified tickets; Sonnet for most features; Opus for the security-critical schema/RLS work.

## Useful commands

```bash
npm run lint && npm run typecheck && npm test && npm run format:check
npm run db:start | db:stop | db:reset | db:test | db:types
npm run web        # quick look in a browser
npm run ios        # simulator dev build
```
