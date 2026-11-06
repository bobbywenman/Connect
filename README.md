# KnowThem

Remember the people in your life. KnowThem lets you map your networks (family, friends, coworkers), connect people with relationships, and study them with flashcards before the wedding, reunion or first day at a new job.

**Status:** milestone M0 (Foundation) in progress. See [the roadmap](docs/roadmap.md).

## Docs

| Doc                                      | What's in it                                          |
| ---------------------------------------- | ----------------------------------------------------- |
| [Roadmap](docs/roadmap.md)               | Milestones and every ticket, linked to GitHub issues  |
| [Decisions](docs/decisions.md)           | Choices that change or clarify the requirements       |
| [Architecture](docs/architecture.md)     | Stack, folder layout, data model                      |
| [Supabase setup](docs/setup/supabase.md) | Local and hosted backend setup                        |
| [Requirements](docs/requirements/)       | Original PRD, feature backlog and engineering tickets |
| [CLAUDE.md](CLAUDE.md)                   | How we work, conventions, definition of done          |

## Tech

React Native + Expo (TypeScript), Expo Router, TanStack Query, Zustand, Supabase.

## Getting started

Requirements: Node 22 (see `.nvmrc`), npm, and for iOS a Mac with Xcode.

```bash
npm install
```

Create your `.env` (gitignored) from the template. For the local backend (needs Docker), start it and copy the URL and publishable key it prints (also shown by `npx supabase status`) into `.env`; for the hosted project, use the key from the dashboard. See [Supabase setup](docs/setup/supabase.md).

```bash
cp .env.example .env
```

```bash
npm run db:start
```

Run on the iOS simulator (builds a development app the first time):

```bash
npm run ios
```

Run in a web browser:

```bash
npm run web
```

Checks (all run in CI):

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

Format code with `npm run format`. Add packages with `npx expo install <package>` so versions match the Expo SDK.

### Project layout

App code lives in `src/`. Routes (screens) are files in `src/app/` (Expo Router). Import from `src` with the `@/` alias, e.g. `import { BrandTitle } from '@/components'`. See [Architecture](docs/architecture.md) for the full layout.
