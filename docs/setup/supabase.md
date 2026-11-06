# Supabase setup

## Project

- Dashboard: https://supabase.com/dashboard/project/mpbmcgyknbpriwhanait
- API URL: `https://mpbmcgyknbpriwhanait.supabase.co`

## Local development

Requires Docker.

```bash
npx supabase start
```

```bash
npx supabase db reset
```

```bash
npx supabase test db
```

`supabase start` prints a local API URL and anon key. Put them in `.env` (copy `.env.example`) to point the app at your local database. Local auth emails appear in the Mailpit inbox it prints.

## Hosted project

1. In the dashboard, open **Project Settings → API** and copy the anon (public) key into your `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`, with `EXPO_PUBLIC_SUPABASE_URL=https://mpbmcgyknbpriwhanait.supabase.co`.
2. Link and push migrations (you'll be asked for the database password):

```bash
npx supabase link --project-ref mpbmcgyknbpriwhanait
```

```bash
npx supabase db push
```

3. Never put the service role key or the database password in the repo or the app.

### For Claude cloud sessions
To let Claude push migrations or run against the hosted project, add the needed values as secrets in the cloud environment settings rather than pasting them in chat. Claude will ask when a ticket needs it.

## Auth providers (filled in as tickets land)

- **Email** (KT-07): Authentication → Providers → Email. Decide on "Confirm email" (on for production).
- **Redirect URLs** (KT-08, KT-09): add `knowthem://**` under Authentication → URL Configuration.
- **Google** (KT-09): Google Cloud OAuth client IDs (iOS + web) → Authentication → Providers → Google.
- **Apple** (KT-10): Apple Developer Services ID + key → Authentication → Providers → Apple.
