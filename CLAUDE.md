# KnowThem: guide for Claude

KnowThem is a React Native (Expo) app that helps people remember the people in their lives. Users map networks (family, friends, work), connect people with relationships, and study them with flashcards. Backend is Supabase.

## Read first
- `docs/decisions.md`: decisions that **override** the original requirements. Check it before relying on `docs/requirements/`.
- `docs/architecture.md`: stack, folder layout, data model, environments.
- `docs/roadmap.md`: milestones and ticket index (KT-xx), each linked to a GitHub issue.
- `docs/requirements/`: original PRD, feature backlog and engineering tickets (markdown copies of the Word files in `source/`).

## How we work
1. **One ticket at a time.** Work comes from GitHub issues titled `KT-xx: ...` in `bobbywenman/connect`. Read the issue and its dependencies first. If a dependency isn't done, say so.
2. **Branch per ticket:** `kt-xx-short-name` off `main` (unless the session assigns a branch). Commit messages start with the ticket ID: `KT-14: add person form sections`.
3. **Open a PR per ticket** that says `Closes #<issue>`, lists what was verified, and includes screenshots for UI changes.
4. **Definition of done:** every acceptance-criteria box in the issue is met, `npm run lint`, `npm run typecheck` and `npm test` pass, new logic has tests, and docs are updated when structure or the data model changes.
5. **Ask, don't guess,** when a requirement is ambiguous and the answer changes the data model or UX. Record new decisions in `docs/decisions.md`.
6. **Scope:** do what the ticket says. Note follow-ups as new issues instead of growing the PR.

## Commands
Exact scripts are set up in KT-01. Expected:

```bash
npm install
npm run web          # web preview (used for screenshots in cloud sessions)
npm run ios          # iOS simulator (developer's Mac)
npm run lint
npm run typecheck
npm test
npx supabase start   # local backend (Docker)
npx supabase db reset
npx supabase test db
```

## Code conventions
- TypeScript strict; no `any` without a comment explaining why.
- Import with the `@/` alias (maps to `src/`).
- Screens in `src/app/` stay thin. Database calls live only in `src/features/<feature>/api.ts` and are used through TanStack Query hooks.
- UI uses design-system components and tokens from `src/constants`. No hard-coded colors or font sizes.
- Every interactive element gets an `accessibilityLabel` and a tap target of at least 44x44pt. Never use color as the only signal.
- Pure logic (relationship inverses, deck generation, date math, CSV parsing) lives in plain functions with unit tests.
- Database changes go in a **new** migration in `supabase/migrations/`, with RLS on every table and a pgTAP test. Regenerate `src/types/database.ts` after.

## Secrets
- Never commit `.env`, the Supabase service role key, or the database password.
- The anon key and project URL (`https://mpbmcgyknbpriwhanait.supabase.co`) are public by design.
- If a task needs a secret, ask the user to add it to the environment settings. Never ask them to paste it in chat.

## Verifying in cloud sessions
There is no iOS simulator in the cloud sandbox. Verify with tests, plus web-build screenshots (Playwright) for UI. Call out anything that needs checking on a real device (animations, camera, contacts, notifications, Apple sign-in) in the PR under "Needs device check".
