# Supabase setup

## Project

- Dashboard: https://supabase.com/dashboard/project/mpbmcgyknbpriwhanait
- API URL: `https://mpbmcgyknbpriwhanait.supabase.co`

## Local development

Requires Docker. The Supabase CLI is a dev dependency, so `npx supabase ...` and the npm scripts below use the pinned version.

| Script             | Runs                                                            | What it does                                                         |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run db:start` | `supabase start`                                                | Start the local stack (Postgres, Auth, Storage, REST) in Docker      |
| `npm run db:stop`  | `supabase stop`                                                 | Stop it                                                              |
| `npm run db:reset` | `supabase db reset`                                             | Recreate the database: apply `supabase/migrations/`, then `seed.sql` |
| `npm run db:test`  | `supabase test db`                                              | Run the pgTAP tests in `supabase/tests/`                             |
| `npm run db:types` | `supabase gen types typescript --local > src/types/database.ts` | Regenerate the TypeScript types after a schema change                |

`supabase start` prints a local API URL and a publishable key (`sb_publishable_...`). Put them in `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to point the app at your local database. Local auth emails appear in the Mailpit inbox it prints.

### Demo login (local only)

`npm run db:reset` loads `supabase/seed.sql`, which creates:

- **Email:** `demo@knowthem.app`
- **Password:** `password123`

The demo user (self person "Alex Wenman") has a "Wenman Family" network (parents, sister and brother-in-law, spouse, uncle, cousin, niece, with birthdays, tags and relationships to Alex) and a "Work" network with a manager / direct-report chain. The seed is for local development only and is never pushed to the hosted project.

### Changing the schema

1. Add a **new** migration: `npx supabase migration new <name>` (never edit one that has been applied).
2. Enable RLS and add select/insert/update/delete policies for any new table, and add it to the pgTAP tests (`00_schema_security_test.sql` lists every table on purpose, so it fails until you do).
3. `npm run db:reset && npm run db:test && npm run db:types`.

## Hosted project

1. In the dashboard, open **Project Settings → API Keys** and copy the publishable key (starts with `sb_publishable_`) into your `.env` as `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with `EXPO_PUBLIC_SUPABASE_URL=https://mpbmcgyknbpriwhanait.supabase.co`.
2. Link and push migrations (you'll be asked for the database password):

```bash
npx supabase link --project-ref mpbmcgyknbpriwhanait
```

```bash
npx supabase db push
```

3. Never put the secret (service role) key or the database password in the repo or the app.

### For Claude cloud sessions

To let Claude push migrations or run against the hosted project, add the needed values as secrets in the cloud environment settings rather than pasting them in chat. Claude will ask when a ticket needs it.

## Auth providers (filled in as tickets land)

- **Email** (KT-07): Authentication → Providers → Email. Locally, `supabase/config.toml` sets `[auth.email] enable_confirmations = false` so sign-up signs the user in immediately. **Production should turn "Confirm email" on** (tracked in KT-44); the app already handles it by showing "Check your email to confirm" after sign-up.
- **Redirect URLs** (KT-08, KT-09): add `knowthem://**` under Authentication → URL Configuration. Locally, `supabase/config.toml` already allows `knowthem://**` and `http://localhost:8081` (Expo web).
- **Google** (KT-09): Google Cloud OAuth client IDs (iOS + web) → Authentication → Providers → Google.
- **Apple** (KT-10): Apple Developer Services ID + key → Authentication → Providers → Apple.
