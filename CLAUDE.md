# KnowThem — CLAUDE.md

## Project Overview

**KnowThem** is a React Native mobile app (iOS & Android) for network-first relationship mapping and social memory. Users build digital representations of the people in their lives — family, friends, coworkers, teammates — then study those connections via flashcard-style review so they feel more prepared and confident before any social situation.

**Core value prop:** Not just a contact list — a *study tool* for your human network.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo (SDK 51+) |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation (tab + stack) |
| State | Zustand |
| Server State | TanStack Query (React Query) |
| Backend | Supabase (auth + PostgreSQL + storage) |
| Animations | React Native Reanimated + Gesture Handler |
| Images | Expo Image Picker |
| Contacts | Expo Contacts |
| Notifications | Expo Notifications |
| Maps | React Native Maps |
| Forms | React Hook Form |
| Dates | date-fns |
| Lists | @shopify/flash-list |

## Repository Structure

```
/
├── CLAUDE.md                    # This file
├── app/                         # Root App entry (App.tsx, navigation root)
├── src/
│   ├── components/              # Shared reusable UI components
│   │   ├── index.ts             # Barrel export for all components
│   │   ├── Button/
│   │   ├── TextInput/
│   │   ├── Avatar/
│   │   ├── Card/
│   │   ├── Badge/
│   │   └── EmptyState/
│   ├── screens/                 # One folder per screen
│   │   ├── Auth/                # Login, SignUp, ForgotPassword
│   │   ├── Onboarding/          # Multi-step onboarding flow
│   │   ├── Home/                # Network list hub
│   │   ├── Network/             # Create/edit network
│   │   ├── People/              # People list, add/edit person, person detail
│   │   ├── Relationships/       # Add/edit relationship flow
│   │   ├── Study/               # Deck selection, flashcard, session complete
│   │   ├── Events/              # Event list, create event, event detail
│   │   └── Settings/            # Notification settings, merge duplicates
│   ├── store/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── networkStore.ts
│   │   └── studyStore.ts
│   ├── hooks/                   # Custom React hooks
│   │   ├── useSupabase.ts
│   │   ├── useNetworks.ts
│   │   ├── usePeople.ts
│   │   └── useStudySession.ts
│   ├── utils/                   # Pure utility functions
│   │   ├── supabase.ts          # Supabase client initialization
│   │   ├── duplicateDetection.ts
│   │   ├── relationshipInverse.ts
│   │   └── notifications.ts
│   ├── types/                   # Shared TypeScript types
│   │   ├── models.ts            # Database model types
│   │   └── navigation.ts        # Navigation param types
│   └── constants/               # Design tokens
│       ├── colors.ts
│       └── typography.ts
├── supabase/
│   └── migrations/              # SQL migration files
├── .env.example                 # Required environment variables
└── README.md
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Never commit `.env`. Always commit `.env.example` with placeholder values.

## Running the App

```bash
# Install dependencies
yarn install

# Start Expo dev server
yarn start

# Run on iOS simulator
yarn ios

# Run on Android emulator
yarn android

# Run linter
yarn lint

# Run type check
yarn typecheck
```

## Code Conventions

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig)
- All components must export their prop interface
- Use `type` for object shapes, `interface` for component props
- No `any` — use `unknown` and narrow with type guards

### Components
- Use `StyleSheet.create` for all styles — no inline style objects
- All components receive typed props with exported interfaces
- Functional components only — no class components
- Co-locate component tests in `__tests__/` sibling folder

### Naming
- Files: `PascalCase` for components/screens, `camelCase` for hooks/utils
- Hooks: always prefixed with `use`
- Zustand stores: always suffixed with `Store`
- Types: `PascalCase`, exported from `/types/models.ts`

### Data Fetching
- All remote data goes through TanStack Query (`useQuery` / `useMutation`)
- Query keys follow the pattern: `['entity', 'qualifier', id]`
  - Examples: `['networks']`, `['persons', networkId]`, `['person', personId]`
- Never call Supabase directly inside components — use hooks

### Git
- Branch naming: `feature/<ticket-id>-short-description`
  - Example: `feature/E1-01-project-scaffolding`
- Commit messages: `<ticket-id>: <present-tense verb> <what>`
  - Example: `E1-01: initialize Expo project with TypeScript`
- PRs require passing lint and typecheck before merge

## Database Schema

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | Auth users; extended profile |
| `networks` | Named color-coded groups |
| `persons` | Individual people in a network |
| `relationships` | Typed edge between two persons |
| `events` | Named event with date/location |
| `event_persons` | Junction: event ↔ person |
| `study_sessions` | A completed review session |
| `study_results` | Per-card result within a session |

Row Level Security (RLS) is enabled on all tables. Users can only read/write their own data.

## Multi-Agent Development Architecture

This project is designed to support multiple Claude Code agents working **concurrently** on independent epics. The following rules prevent conflicts.

### Agent Assignment Model

Each agent works on **one epic at a time**. Epics are independent feature domains:

| Epic | Domain | Key Dependencies |
|------|--------|-----------------|
| E1 | Foundation & Setup | None — must be done first |
| E2 | Authentication | E1 |
| E3 | Network Management | E1, E2 |
| E4 | People Management | E1, E2, E3 |
| E5 | Relationship Management | E1, E2, E3, E4 |
| E6 | Study Mode | E1, E2, E3, E4, E5 |
| E7 | Network Views | E1, E2, E3, E4 |
| E8 | Event Prep | E1, E2, E3, E4 |
| E9 | Notifications | E1, E2, E4 |
| E10 | Polish & Accessibility | E1-E9 |

**Parallelism rule:** E1 must be sequential. After E1 is complete, E2 must complete before branching further. After E2: E3, E9, and parts of E4 can run in parallel. Full parallelism is available once E4 is complete.

### File Ownership by Epic

To avoid merge conflicts, each epic owns specific directories:

```
E1  → src/constants/, src/components/, src/utils/supabase.ts, supabase/migrations/
E2  → src/screens/Auth/, src/screens/Onboarding/, src/store/authStore.ts
E3  → src/screens/Home/, src/screens/Network/, src/store/networkStore.ts, src/hooks/useNetworks.ts
E4  → src/screens/People/, src/hooks/usePeople.ts
E5  → src/screens/Relationships/
E6  → src/screens/Study/, src/store/studyStore.ts, src/hooks/useStudySession.ts
E7  → (extends E4 screens with view-toggle components)
E8  → src/screens/Events/
E9  → src/utils/notifications.ts, src/screens/Settings/
E10 → Cross-cutting: empty states, accessibility labels, error handling
```

### Shared Files — Coordination Required

These files are touched by multiple epics. Agents must not edit them simultaneously:

- `app/App.tsx` — navigation root (coordinate via PR)
- `src/types/models.ts` — shared type definitions
- `src/types/navigation.ts` — navigation param types
- `supabase/migrations/` — database schema (sequential only)

**Protocol for shared files:**
1. Only one agent edits a shared file per PR
2. If two agents need to modify the same shared file, coordinate via sequential PRs
3. Navigation types are bootstrapped in E1 and extended by each epic via additive changes only

### Branch Strategy

```
main
└── feature/E1-01-project-scaffolding   (sequential, unblocks all others)
    └── feature/E1-02-design-system
        └── feature/E1-03-supabase-config
            ├── feature/E2-01-email-auth          (Agent A)
            ├── feature/E3-01-home-screen          (Agent B, after E2)
            ├── feature/E4-01-people-list          (Agent C, after E3)
            ├── feature/E5-01-add-relationship     (Agent D, after E4)
            ├── feature/E6-01-study-deck           (Agent E, after E4)
            ├── feature/E7-01-graph-view           (Agent F, after E4)
            └── feature/E9-01-notifications        (Agent G, after E4)
```

### Agent Workflow

When starting a ticket:

1. **Pull latest `main`** — `git pull origin main`
2. **Create feature branch** — `git checkout -b feature/<ticket-id>-<slug>`
3. **Check dependencies** — read the ticket's CONTEXT section; ensure prerequisite tickets are merged
4. **Implement** — work within your epic's owned directories
5. **Run checks** — `yarn lint && yarn typecheck`
6. **Commit** — use format `<ticket-id>: <description>`
7. **Push and PR** — target `main`; reference the ticket ID in the PR title

When a ticket is blocked waiting on another agent's PR:
- Stop and start a different ticket in your epic that has no dependency
- Never commit partial/broken implementations to main

### Avoiding Common Conflicts

**Navigation:** Each screen adds itself to the navigation type and registers in the navigator. Do this in a single commit per screen. Never reorder existing routes.

**Supabase types:** Generate Supabase TypeScript types (`supabase gen types typescript`) once per schema migration. Regenerate after each migration lands in main.

**Design system:** The E1 design system is read-only for all other epics. If a component needs a variant not yet supported, open a separate PR targeting E1 first.

**State stores:** Each epic owns its store file. Never import one store into another — use selectors/hooks as the interface between concerns.

## Testing Strategy

- Unit tests for: utility functions, custom hooks (with mocked Supabase), Zustand store reducers
- Integration tests for: full screen render with mocked queries
- Manual E2E: tested on both iOS Simulator and Android Emulator before PR merge

Run tests: `yarn test`

## Ticket Reference

All engineering tickets are in GitHub Issues, labeled by epic:
- `epic:foundation`, `epic:auth`, `epic:networks`, `epic:people`, `epic:relationships`
- `epic:study`, `epic:views`, `epic:events`, `epic:notifications`, `epic:polish`

Priority labels: `P0` (MVP must-have), `P1` (MVP should-have), `P2` (future)

To see all open MVP tickets: filter by `P0` label.
