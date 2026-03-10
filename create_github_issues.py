#!/usr/bin/env python3
"""
Creates all KnowThem GitHub issues from the engineering backlog.
Usage: GITHUB_TOKEN=<your_pat> python3 create_github_issues.py
The PAT needs 'repo' scope on bobbywenman/Connect.
"""

import os
import json
import time
import urllib.request
import urllib.error

REPO = "bobbywenman/Connect"
TOKEN = os.environ.get("GITHUB_TOKEN")
API = f"https://api.github.com/repos/{REPO}"


def gh(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"token {TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "KnowThem-issue-creator/1.0",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return None


def ensure_labels():
    """Create all required labels if they don't exist."""
    desired = [
        ("epic:foundation",      "0052cc", "Epic 1: Foundation & Setup"),
        ("epic:auth",            "0075ca", "Epic 2: Authentication & Onboarding"),
        ("epic:networks",        "e4e669", "Epic 3: Network Management"),
        ("epic:people",          "a2eeef", "Epic 4: People Management"),
        ("epic:relationships",   "d93f0b", "Epic 5: Relationship Management"),
        ("epic:study",           "0e8a16", "Epic 6: Study Mode"),
        ("epic:views",           "fbca04", "Epic 7: Network Views"),
        ("epic:events",          "f9d0c4", "Epic 8: Event Prep Mode"),
        ("epic:notifications",   "c5def5", "Epic 9: Notifications & Reminders"),
        ("epic:polish",          "bfd4f2", "Epic 10: Polish & Accessibility"),
        ("P0",                   "b60205", "Must Have - MVP"),
        ("P1",                   "e99695", "Should Have - MVP+"),
        ("P2",                   "fef2c0", "Nice to Have - Future"),
        ("effort:XS",            "ededed", "Effort: <1 day"),
        ("effort:S",             "ededed", "Effort: 1-2 days"),
        ("effort:M",             "ededed", "Effort: 3-5 days"),
        ("effort:L",             "ededed", "Effort: 1-2 weeks"),
        ("effort:XL",            "ededed", "Effort: 2+ weeks"),
    ]
    existing = {l["name"] for l in (gh("GET", "/labels?per_page=100") or [])}
    for name, color, desc in desired:
        if name not in existing:
            result = gh("POST", "/labels", {"name": name, "color": color, "description": desc})
            status = "created" if result else "failed"
            print(f"  Label '{name}': {status}")
            time.sleep(0.3)


def create_issue(title, body, labels):
    result = gh("POST", "/issues", {"title": title, "body": body, "labels": labels})
    if result:
        print(f"  #{result['number']}: {title}")
    time.sleep(0.5)  # Stay under rate limits
    return result


# ---------------------------------------------------------------------------
# ISSUES DEFINITIONS
# ---------------------------------------------------------------------------

ISSUES = [

    # =========================================================================
    # EPIC 1: FOUNDATION
    # =========================================================================
    {
        "title": "E1-01: Initialize Expo project with TypeScript and folder structure",
        "labels": ["epic:foundation", "P0", "effort:S"],
        "body": """## Goal
Initialize the KnowThem React Native Expo project with TypeScript, folder structure, and core dependencies.

## Context
This is the first ticket. All other tickets depend on it.

## Requirements
- Initialize Expo project with TypeScript template: `npx create-expo-app@latest KnowThem --template blank-typescript`
- Configure absolute imports using tsconfig paths (e.g., `@/components`, `@/screens`, `@/store`)
- Install core dependencies: `react-navigation`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
- Install Expo dependencies: `expo-image-picker`, `expo-contacts`, `expo-notifications`, `expo-secure-store`
- Install utility libraries: `zustand`, `@tanstack/react-query`, `date-fns`
- Set up ESLint and Prettier with standard React Native rules
- Create folder structure: `/app`, `/components`, `/screens`, `/store`, `/hooks`, `/utils`, `/types`, `/constants`
- Create a placeholder `App.tsx` that renders a 'KnowThem' text on screen

## Acceptance Criteria
- [ ] App runs on iOS simulator without errors
- [ ] App runs on Android emulator without errors
- [ ] Absolute imports work: importing from `@/components` resolves correctly
- [ ] ESLint runs clean with no errors on the initial codebase
- [ ] Folder structure matches the specified layout

## Technical Notes
- Use Expo SDK 51 or latest stable
- Node version: 18+ required
- Use yarn or npm consistently — pick one and document in README
""",
    },
    {
        "title": "E1-02: Build core design system and shared UI components",
        "labels": ["epic:foundation", "P0", "effort:M"],
        "body": """## Goal
Build the shared design system including color tokens, typography scale, and reusable UI components.

## Context
All screens will import from this design system. Establish it early so subsequent tickets use consistent styles.

## Requirements
- Create `/constants/colors.ts` with: primary (#1E3A5F), accent (#2980B9), background (#FFFFFF), surface (#F5F5F5), text (#111111), textSecondary (#555555), error (#C0392B), success (#1A7340)
- Create `/constants/typography.ts` with sizes, weights, and font family
- Build `<Button>` component: variants (primary, secondary, ghost, danger), sizes (sm, md, lg), loading state, disabled state
- Build `<TextInput>` component: label, placeholder, error message, multiline support, secureTextEntry
- Build `<Avatar>` component: photo or initials fallback; sizes (sm=32, md=48, lg=64, xl=96)
- Build `<Card>` component: white surface with subtle shadow, optional onPress
- Build `<Badge>` component: small pill label with background color and text
- Build `<EmptyState>` component: icon, title, subtitle, optional CTA button
- Export all from `/components/index.ts`

## Acceptance Criteria
- [ ] All components render in isolation without errors
- [ ] Button shows loading spinner when `isLoading=true`
- [ ] Avatar shows initials when no `photoUrl` provided
- [ ] EmptyState renders with and without CTA button
- [ ] All color and typography constants are importable

## Technical Notes
- Use `StyleSheet.create` for all styles — no inline style objects
- All components must be TypeScript typed with exported prop interfaces
- Test on both iOS and Android — shadows behave differently per platform

## Depends on
E1-01
""",
    },
    {
        "title": "E1-03: Configure Supabase client and create database schema",
        "labels": ["epic:foundation", "P0", "effort:M"],
        "body": """## Goal
Configure Supabase as the backend: initialize client, set up environment variables, and create the core database schema.

## Context
All data storage and auth flows depend on Supabase being configured. Complete this before Epic 2.

## Requirements
- Install `@supabase/supabase-js`
- Create `/utils/supabase.ts` that initializes the Supabase client using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Create `.env.example` documenting required env vars
- Create Supabase tables via SQL migration:
  - `users` (id, email, name, avatar_url, created_at)
  - `networks` (id, owner_user_id, name, type, color, description, created_at, updated_at)
  - `persons` (id, network_id, first_name, last_name, preferred_name, photo_url, pronouns, birthdate, anniversary_date, location_city, location_lat, location_lng, notes, tags[], job_title, hometown, fun_facts, conversation_starters, import_source, created_at, updated_at)
  - `relationships` (id, network_id, source_person_id, target_person_id, relationship_type, inverse_type, badge_label, notes, created_at, updated_at)
  - `events` (id, network_id, name, event_date, location, description, created_at)
  - `event_persons` (event_id, person_id)
  - `study_sessions` (id, user_id, network_id, deck_type, started_at, ended_at)
  - `study_results` (id, session_id, person_id, result, response_time_ms)
- Enable Row Level Security (RLS) on all tables
- Create Supabase Storage bucket named `avatars`
- Write `/hooks/useSupabase.ts` hook

## Acceptance Criteria
- [ ] Supabase client initializes without errors
- [ ] All tables exist with correct columns and types
- [ ] RLS policy prevents user A from reading user B's networks
- [ ] Avatars storage bucket exists
- [ ] Environment variables load correctly via Expo config

## Technical Notes
- Never commit actual `.env` file — only `.env.example`
- `tags` column on persons should be `text[]` (Postgres array)
- Use `uuid` as primary key type on all tables

## Depends on
E1-01
""",
    },

    # =========================================================================
    # EPIC 2: AUTHENTICATION
    # =========================================================================
    {
        "title": "E2-01: Build email/password sign up, login, and forgot password screens",
        "labels": ["epic:auth", "P0", "effort:S"],
        "body": """## Goal
Build sign up, log in, and forgot password screens using Supabase Auth with email/password.

## Context
Prerequisite: E1-03 (Supabase configured). These screens are the app entry point for new users.

## Requirements
- Build `<SignUpScreen>`: name, email, password, confirm password fields; on success → onboarding
- Build `<LoginScreen>`: email and password; on success → home
- Build `<ForgotPasswordScreen>`: email field; calls `supabase.auth.resetPasswordForEmail()`
- Form validation: required fields, email format, password min 8 chars, passwords match
- Show inline error messages below invalid fields
- Loading state on submit buttons during async calls
- Navigation links between screens
- Store session using `expo-secure-store` via Supabase's custom storage adapter

## Acceptance Criteria
- [ ] User can sign up with valid email/password and is navigated to onboarding
- [ ] Duplicate email shows Supabase error message
- [ ] User can log in and is navigated to home
- [ ] Wrong password shows error message
- [ ] Forgot password sends reset email
- [ ] Session persists after closing and reopening the app
- [ ] All validation errors show inline below the relevant field

## Technical Notes
- Use `react-hook-form` with `Controller` for form state management
- Use Supabase SecureStore adapter for session persistence

## Depends on
E1-03
""",
    },
    {
        "title": "E2-02: Add Google OAuth and Apple Sign In",
        "labels": ["epic:auth", "P0", "effort:S"],
        "body": """## Goal
Add Google and Apple Sign-In to the login screen using Supabase's OAuth providers.

## Context
Apple Sign-In is required by Apple App Store guidelines for iOS apps that offer social login.

## Requirements
- Add 'Continue with Google' button using `supabase.auth.signInWithOAuth({ provider: 'google' })` with Expo WebBrowser
- Add 'Sign in with Apple' button (iOS only, hidden on Android) using `expo-apple-authentication`
- On successful OAuth: navigate to onboarding if new user, home if existing user
- Handle OAuth cancellation gracefully

## Acceptance Criteria
- [ ] Google login opens browser, authenticates, and returns user to app
- [ ] Apple login works on iOS device/simulator
- [ ] Apple button is not visible on Android
- [ ] Cancelled OAuth returns to login screen without error
- [ ] New OAuth user → onboarding; returning user → home

## Technical Notes
- Configure Google and Apple providers in Supabase Authentication dashboard
- Apple Sign In requires a real device or Simulator with iOS 13+
- Add URL scheme to `app.json` for OAuth redirect

## Depends on
E2-01
""",
    },
    {
        "title": "E2-03: Build multi-step onboarding flow",
        "labels": ["epic:auth", "P0", "effort:L"],
        "body": """## Goal
Build a guided multi-step onboarding flow that walks new users through creating their first network, adding people, and connecting relationships.

## Context
Onboarding only appears once — on first login. After completion, set a flag in the user's record.

## Requirements
- Step 1: Welcome — App name, tagline, 'Get Started' button
- Step 2: Create First Network — Name, type picker, 8-color picker. Saves Network record.
- Step 3: Add Your First People — Prompt to add 2-3 people. Show added people as avatar chips.
- Step 4: Connect Relationships — For each person, prompt to connect with 'Add Relationship' flow.
- Step 5: See Your Network — Preview of list view with newly added people.
- Step 6: Try Study Mode — Prompt with 'Start Studying' CTA.
- Progress indicator (dots or step counter) at top
- Allow 'Skip' on steps 3-6
- On completion, set `onboarding_complete = true` in users table

## Acceptance Criteria
- [ ] New user sees onboarding after first sign up
- [ ] Returning user does NOT see onboarding
- [ ] Each step advances correctly with valid input
- [ ] Skipping steps 3-6 completes onboarding and navigates to home
- [ ] First network is saved to Supabase by end of onboarding
- [ ] Progress indicator reflects current step

## Technical Notes
- Use step-based local state machine (`currentStep: number`) rather than separate screens
- Animate step transitions with a horizontal slide
- The Add Person form used here should be the same component used throughout the app

## Depends on
E2-01
""",
    },

    # =========================================================================
    # EPIC 3: NETWORK MANAGEMENT
    # =========================================================================
    {
        "title": "E3-01: Build home screen with network list",
        "labels": ["epic:networks", "P0", "effort:M"],
        "body": """## Goal
Build the home screen that displays all user networks with color coding and provides entry points to create new networks.

## Requirements
- Fetch all networks for current user from Supabase on mount
- Each network card: color swatch/bar, network name, type label, person count
- Tapping a network → People List screen
- + FAB to create a new network
- `<EmptyState>` with 'Create your first network' CTA when no networks exist
- Loading skeleton while fetching
- Pull-to-refresh support

## Acceptance Criteria
- [ ] Networks list loads and displays within 1 second
- [ ] Each card shows correct color, name, type, and person count
- [ ] Tapping a card navigates to that network's people list
- [ ] + FAB opens Create Network flow
- [ ] Empty state renders with CTA when user has no networks
- [ ] Pull-to-refresh re-fetches and updates the list

## Technical Notes
- Use `useQuery` (TanStack Query) for fetch/cache state
- Color bar: 3-4px wide vertical bar spanning full left edge of card

## Depends on
E2-03
""",
    },
    {
        "title": "E3-02: Build create and edit network form",
        "labels": ["epic:networks", "P0", "effort:S"],
        "body": """## Goal
Build the create network form (also used for editing) with name, type, and color picker.

## Requirements
- Fields: Network Name (required, max 50 chars), Type (Family/Friends/Work/Custom), Color (8 preset swatches)
- On create: POST to Supabase networks table
- On edit: PATCH existing network record
- Validate: name required
- After save: navigate back and refresh networks list
- Delete option on edit screen with confirmation alert mentioning cascade deletion

## Acceptance Criteria
- [ ] Network saves with correct name, type, and color
- [ ] Empty name shows validation error and does not submit
- [ ] Created network appears immediately in home screen list
- [ ] Color picker selection updates a preview swatch
- [ ] Delete confirmation alert appears before deletion
- [ ] Deleted network and all its persons/relationships are removed

## Technical Notes
- Use a bottom sheet or modal screen for the form
- Supabase cascade delete: configure `ON DELETE CASCADE` in the schema

## Depends on
E3-01
""",
    },

    # =========================================================================
    # EPIC 4: PEOPLE MANAGEMENT
    # =========================================================================
    {
        "title": "E4-01: Build people list screen per network",
        "labels": ["epic:people", "P0", "effort:M"],
        "body": """## Goal
Build the primary list view for a network — shows all people sorted alphabetically with avatar, name, and relationship summary.

## Requirements
- Fetch all persons in the selected network from Supabase
- List: Avatar (photo or initials), full name (preferred name in parentheses if set), primary relationship label
- Sort alphabetically by last name, then first name
- Network color as thin header bar at top
- Search bar — client-side filter on name, nickname, tags
- Filter button → filter sheet: by tag, group, relationship type
- + FAB to add a new person
- Tap person → Person Detail screen
- `<EmptyState>` with 'Add your first person' CTA

## Acceptance Criteria
- [ ] List renders all persons sorted A-Z by last name
- [ ] Search filters list in real time without API call
- [ ] Tapping a person opens their detail screen
- [ ] + FAB opens Add Person form with current networkId
- [ ] Empty state shows when no people exist
- [ ] List of 100 people renders without jank

## Technical Notes
- Use `FlashList` (from `@shopify/flash-list`) instead of `FlatList` for performance
- Initials fallback: first letter of firstName + first letter of lastName

## Depends on
E3-01
""",
    },
    {
        "title": "E4-02: Build add/edit person form with progressive disclosure",
        "labels": ["epic:people", "P0", "effort:M"],
        "body": """## Goal
Build the add/edit person form with all profile fields, organized into collapsible sections.

## Requirements
- Section 1 — Basic Info (always expanded): First Name (required), Last Name, Preferred Name, Profile Photo
- Section 2 — Personal (collapsed): Gender/Pronouns, Birthdate (with reminder toggle), Anniversary (with reminder toggle)
- Section 3 — Location: City text field, optional 'Use current location' button
- Section 4 — Work: Job Title, Company, Department
- Section 5 — Notes & Tags: Notes (multiline), Tags (chip input), Fun Facts, Conversation Starters
- On save: POST/PATCH to Supabase
- Duplicate name check on save — warning if same first+last name exists in network

## Acceptance Criteria
- [ ] Form saves person with only first name filled
- [ ] All optional fields save correctly when filled
- [ ] Profile photo uploads to Supabase Storage and `photo_url` is saved
- [ ] Duplicate name warning appears when same name exists in network
- [ ] Cancel dismisses without saving
- [ ] Editing pre-populates all existing field values

## Technical Notes
- Use `react-hook-form` for form state management
- Profile photo: use `expo-image-picker`; resize to max 500x500 before upload
- Date picker: use `@react-native-community/datetimepicker`
- Tags chip input: each tag as removable chip; comma/return adds tag

## Depends on
E4-01
""",
    },
    {
        "title": "E4-03: Build person detail screen",
        "labels": ["epic:people", "P0", "effort:M"],
        "body": """## Goal
Build the person detail screen showing all profile information and all direct relationships.

## Requirements
- Header: large Avatar, full name, preferred name (if different), pronouns
- Relationship badges: horizontal scrollable row of `<Badge>` chips for each relationship
- Info section: Birthday (with days-until indicator), Anniversary, Location, Job Title
- Notes, Tags, Fun Facts, Conversation Starters sections (hidden if empty)
- Connections section: list all connected people with relationship label and avatar; tap → their detail
- Edit button → Edit Person form
- Three-dot menu: Archive, Delete
- Floating 'Add Relationship' button at bottom

## Acceptance Criteria
- [ ] All populated fields display correctly
- [ ] Empty fields are hidden (not shown as blank rows)
- [ ] Relationship badges render for all existing relationships
- [ ] Tapping a connection opens that person's detail screen
- [ ] Edit button pre-populates form with current data
- [ ] Delete shows confirmation and removes person

## Technical Notes
- Use `ScrollView` with sticky header for the avatar/name section
- Days-until-birthday: calculate from today to next occurrence (handle year rollover)
- Connections query: SELECT relationships WHERE `source_person_id = id OR target_person_id = id`

## Depends on
E4-02
""",
    },

    # =========================================================================
    # EPIC 5: RELATIONSHIP MANAGEMENT
    # =========================================================================
    {
        "title": "E5-01: Build add relationship flow with inverse relationship inference",
        "labels": ["epic:relationships", "P0", "effort:M"],
        "body": """## Goal
Build the flow to connect two people in a network with a typed relationship.

## Requirements
- Step 1 — Select Target Person: searchable list of other people in the same network
- Step 2 — Select Relationship Type: categorized picker (Family, Professional, Social, Other/Custom)
- Step 3 — Review and confirm: summary sentence before saving
- On save: INSERT into relationships; INSERT inverse relationship automatically
- Duplicate relationship check: warn if same pair + type already exists

## Acceptance Criteria
- [ ] User can select any other person in the network as the target
- [ ] All predefined relationship types are available
- [ ] Custom label can be entered and saves correctly
- [ ] Inverse relationship record is created automatically
- [ ] Duplicate relationship shows warning and does not create a duplicate
- [ ] New relationship appears on both person detail screens after save

## Technical Notes
Inverse type map: parent↔child, sibling↔sibling, spouse↔spouse, manager↔direct report, mentor↔mentee, aunt/uncle↔niece/nephew, grandparent↔grandchild. For friend/coworker/acquaintance: create the same type in both directions.

## Depends on
E4-03
""",
    },

    # =========================================================================
    # EPIC 6: STUDY MODE
    # =========================================================================
    {
        "title": "E6-01: Build study deck selection and generation flow",
        "labels": ["epic:study", "P0", "effort:M"],
        "body": """## Goal
Build the study deck selection and generation flow — allowing users to choose what to study and launch a flashcard session.

## Requirements
- Study entry screen: options for Entire network / By group or tag / Recently added (last 30 days) / Specific event
- After selection: deck preview showing count and avatar strip, 'Start Studying' button
- Generate card prompts per person: 'Who is this?', 'How is [Name] related to you?', 'What does [Name] do?', 'What group is [Name] part of?' (only if relevant data exists)
- Randomize card order
- Create a `StudySession` record in Supabase on start

## Acceptance Criteria
- [ ] All deck types generate with the right people
- [ ] Deck with 0 people shows empty state and does not navigate
- [ ] Card prompts based on available data only
- [ ] Card order is randomized
- [ ] Study session record created in Supabase on start

## Technical Notes
- Pass deck as navigation param or store in Zustand `studyStore`
- 'Recently added': filter by `created_at >= now() - 30 days`

## Depends on
E5-01
""",
    },
    {
        "title": "E6-02: Build flashcard screen with flip animation and confidence rating",
        "labels": ["epic:study", "P0", "effort:M"],
        "body": """## Goal
Build the flashcard UI with flip animation, confidence rating, and session completion.

## Requirements
- One card at a time: front (prompt + photo if 'Who is this?'), back (answer + details)
- Tap card or 'Reveal' button → 3D horizontal flip animation (180° Y-axis rotation)
- After flip: 'Knew it' (green), 'Sort of' (orange), 'Did not know' (red) buttons
- On confidence selection: record `StudyResult` (personId, result, responseTimeMs), advance to next card
- Progress indicator: 'Card 3 of 12'
- After last card → Session Complete screen
- Session Complete: summary stats (donut/bar for knew/sort-of/did-not), 'Study Again' and 'Done' buttons
- 'Study Again' restarts with only did-not and sort-of cards

## Acceptance Criteria
- [ ] Card flip animation runs at 60fps without jank
- [ ] Front and back do not show simultaneously during flip
- [ ] Confidence buttons appear only after card is flipped
- [ ] StudyResult record saved for each card
- [ ] Session Complete screen shows accurate counts
- [ ] 'Study Again' deck contains only low-confidence cards

## Technical Notes
- Use `react-native-reanimated` for flip animation — interpolate `rotateY` 0→180°; use `backfaceVisibility: 'hidden'`
- `responseTimeMs`: measure from card display to confidence button tap
- Update `StudySession.endedAt` in Supabase when session completes

## Depends on
E6-01
""",
    },

    # =========================================================================
    # EPIC 7: NETWORK VIEWS
    # =========================================================================
    {
        "title": "E7-01: Build global search across all networks",
        "labels": ["epic:views", "P0", "effort:M"],
        "body": """## Goal
Implement global search returning results across all networks by name, tags, notes, and groups.

## Requirements
- Search bar accessible from home screen and people list
- Search by: name, tags, notes, groups
- Results show: avatar, full name, network label
- Results return in <300ms (server-side or efficiently indexed client-side)
- Tapping a result → Person Detail screen

## Acceptance Criteria
- [ ] Search returns results matching name, tags, notes, and groups
- [ ] Results appear within 300ms
- [ ] Each result shows photo/initials and network label
- [ ] Tapping a result opens the correct Person Detail screen

## Depends on
E4-03
""",
    },
    {
        "title": "E7-02: Build basic node graph view (togglable per network)",
        "labels": ["epic:views", "P0", "effort:L"],
        "body": """## Goal
Build a basic node/edge graph view that visualizes relationships within a network.

## Requirements
- Toggle button on People List to switch between list and graph view
- Nodes represent people (avatar or initials + name label)
- Edges represent relationships (labeled with relationship type)
- Tapping a node → Person Detail screen
- Graph is zoomable and pannable
- Usable for networks up to 100 nodes

## Acceptance Criteria
- [ ] Graph toggle appears on People List screen
- [ ] All people and relationships render as nodes and edges
- [ ] Tapping a node opens Person Detail
- [ ] Graph is pannable and zoomable
- [ ] Remains usable for 50-node networks

## Technical Notes
- Start with a simple force-directed layout using D3 or `react-native-graph`
- Cap node rendering at 100 for performance; show warning for larger networks

## Depends on
E4-03
""",
    },
    {
        "title": "E7-03: Build org-chart mode for Work-type networks",
        "labels": ["epic:views", "P1", "effort:L"],
        "body": """## Goal
Build a hierarchical org-chart view for Work-type networks using manager/direct-report relationships.

## Requirements
- Available only for Work-type networks
- Renders a top-down tree based on manager/direct-report relationship edges
- Tapping a node → Person Detail screen
- Handles people with no manager (treated as root nodes)

## Acceptance Criteria
- [ ] Org-chart mode option visible only on Work-type networks
- [ ] Hierarchy renders correctly from manager → direct-report edges
- [ ] Disconnected nodes appear as separate roots
- [ ] Tapping a node opens Person Detail

## Depends on
E7-02
""",
    },
    {
        "title": "E7-04: Build map view — pin people by location",
        "labels": ["epic:views", "P1", "effort:L"],
        "body": """## Goal
Build a map view that shows people pinned to their geographic location.

## Requirements
- Map view accessible from People List (tab or toggle)
- People with `location_lat` and `location_lng` appear as map pins
- Pin tap → Person Detail screen
- People without location data are excluded from map view
- Show count of unpinned people in a footer

## Acceptance Criteria
- [ ] People with location data appear as pins on map
- [ ] Tapping a pin opens Person Detail
- [ ] People without location are excluded from map
- [ ] Footer shows count of unpinned people

## Technical Notes
- Use `react-native-maps`

## Depends on
E4-03
""",
    },

    # =========================================================================
    # EPIC 8: EVENT PREP MODE
    # =========================================================================
    {
        "title": "E8-01: Build event creation and management screens",
        "labels": ["epic:events", "P0", "effort:S"],
        "body": """## Goal
Build event creation, event list, and event detail screens.

## Requirements
- Create Event form: Name (required), Date (date picker), Location (text field), Description (optional)
- Event list screen: lists all events for the current network with name, date, attendee count
- Event detail screen: shows all fields + list of associated people

## Acceptance Criteria
- [ ] Event saves with correct name, date, and location
- [ ] Events list shows all events for the network
- [ ] Event detail shows attendees with avatars

## Depends on
E4-01
""",
    },
    {
        "title": "E8-02: Build event person association and event-scoped study deck",
        "labels": ["epic:events", "P0", "effort:S"],
        "body": """## Goal
Allow associating people with events and launching a study deck scoped to event attendees.

## Requirements
- Multi-select people from network to attach to an event (`event_persons` join table)
- 'Start Studying' button on Event Detail launches a study deck containing only event attendees
- Show associated people as avatar row on Event Detail

## Acceptance Criteria
- [ ] User can multi-select people from the network to associate with event
- [ ] Associated people appear on Event Detail screen
- [ ] 'Start Studying' generates deck from only event attendees
- [ ] Empty event shows appropriate empty state

## Depends on
E8-01, E6-01
""",
    },

    # =========================================================================
    # EPIC 9: NOTIFICATIONS
    # =========================================================================
    {
        "title": "E9-01: Implement birthday and anniversary push notification reminders",
        "labels": ["epic:notifications", "P0", "effort:M"],
        "body": """## Goal
Implement push notification reminders for birthdays and anniversaries stored on person profiles.

## Requirements
- On app startup: call `Notifications.requestPermissionsAsync()`; store permission status in global state
- When a person's birthdate is saved with reminder enabled: schedule repeating annual local notification at 9am
- When a person's anniversary is saved with reminder enabled: same logic
- When a person is deleted or reminder toggled off: cancel any existing scheduled notifications
- Tapping a notification deep links to that person's detail screen
- Notification settings screen: global toggle for birthday/anniversary reminders, lead time picker (same day, 1 day before, 3 days before, 1 week before)

## Acceptance Criteria
- [ ] Permission request appears on first birthday with reminder enabled
- [ ] Birthday notification fires at correct time on the correct date
- [ ] Toggling reminder off cancels the notification
- [ ] Deleting a person cancels their notifications
- [ ] Tapping notification opens correct Person Detail screen
- [ ] Changing lead time setting reschedules all existing notifications

## Technical Notes
- Use `expo-notifications` `scheduleNotificationAsync` with `CalendarTrigger` for annual repeating
- Store Expo notification IDs on the person record (`notification_id_birthday`, `notification_id_anniversary`)
- Deep link: configure `Expo Linking` to handle notification tap and navigate to `/person/:id`
- Test on physical device — simulators may not fire local notifications reliably

## Depends on
E4-02
""",
    },

    # =========================================================================
    # EPIC 10: POLISH & ACCESSIBILITY
    # =========================================================================
    {
        "title": "E10-01: Build duplicate detection and profile merge tool",
        "labels": ["epic:polish", "P0", "effort:M"],
        "body": """## Goal
Detect potential duplicate person profiles within a network and provide a merge tool to combine them.

## Requirements
- Run duplicate detection on manual save and after contact import batch
- Detection algorithm: exact match on `firstName + lastName` (case-insensitive) within same network
- When duplicates found: show 'Potential Duplicates' banner on Person Detail, or surface in Settings
- Merge screen: both profiles side-by-side; radio selector per field for which value to keep
- On merge: keep selected values, merge tags arrays, transfer all relationships to surviving record, delete duplicate

## Acceptance Criteria
- [ ] Duplicate pair detected for same first+last name in same network
- [ ] Merge screen shows both profiles' data
- [ ] After merge, one record remains with correct combined data
- [ ] All relationships from both profiles transferred to merged record
- [ ] Duplicate record deleted from Supabase
- [ ] No false positives for people with same first name but different last name

## Technical Notes
- Run duplicate check as background async operation after save — do not block form save
- Relationship transfer: `UPDATE relationships SET source_person_id = survivingId WHERE source_person_id = duplicateId`; same for `target_person_id`

## Depends on
E4-02
""",
    },
    {
        "title": "E10-02: Implement accessibility — screen reader labels, dynamic type, and contrast",
        "labels": ["epic:polish", "P0", "effort:M"],
        "body": """## Goal
Ensure the app meets WCAG 2.1 AA accessibility standards and passes VoiceOver/TalkBack review.

## Requirements
- All interactive elements have `accessibilityLabel` props (VoiceOver / TalkBack)
- Minimum 4.5:1 contrast ratio on all text/background combinations
- Support Dynamic Type (iOS) and `sp` text units (Android)
- Minimum 44x44pt tap targets on all interactive elements
- Test on iOS VoiceOver and Android TalkBack

## Acceptance Criteria
- [ ] All buttons and interactive elements have accessible labels
- [ ] App scales correctly at all iOS text size settings
- [ ] Text and background combinations meet 4.5:1 contrast minimum
- [ ] All tap targets are at least 44x44pt

## Depends on
E1-02
""",
    },
    {
        "title": "E10-03: Add empty states, error handling, and user-facing error messages",
        "labels": ["epic:polish", "P0", "effort:M"],
        "body": """## Goal
Add `<EmptyState>` components to all screens and implement user-friendly error handling throughout the app.

## Requirements
- Every list screen has an `<EmptyState>` with illustration, title, and CTA when no data exists
- Network errors (no internet) show a toast or inline banner with retry option
- Auth errors show inline messages (not generic 'Something went wrong')
- Image upload failures show user-friendly feedback
- No unhandled JS exceptions — all async operations wrapped with try/catch
- Supabase error codes translated to human-readable messages

## Acceptance Criteria
- [ ] Every list screen has an empty state with helpful CTA
- [ ] Network error during data fetch shows retry option
- [ ] Auth errors surface meaningful messages (wrong password, email not found, etc.)
- [ ] App does not crash or show raw error objects to the user

## Depends on
E1-02
""",
    },
    {
        "title": "E10-04: Contact import from phone contacts with duplicate detection",
        "labels": ["epic:polish", "P0", "effort:M"],
        "body": """## Goal
Implement import of people from the device's native phone contacts (iOS/Android).

## Requirements
- Request contacts permission using `expo-contacts`; handle denial gracefully
- Display contacts list: user can select all or a subset
- Import selected contacts as `Person` records in the current network
- Map contact fields: name → firstName/lastName, phone, email, photo
- Run duplicate detection after import; show merge prompts for matches

## Acceptance Criteria
- [ ] Permission prompt shown; graceful handling of denial
- [ ] User sees contacts list and can select/deselect
- [ ] Selected contacts imported as Person records
- [ ] Duplicates flagged post-import with merge option

## Depends on
E4-02
""",
    },
    {
        "title": "E10-05: Performance tuning — list virtualization and image caching",
        "labels": ["epic:polish", "P1", "effort:M"],
        "body": """## Goal
Ensure all list screens perform at 60fps and images load efficiently.

## Requirements
- Use `FlashList` from `@shopify/flash-list` on all list screens (People List, Connections, etc.)
- Implement image caching using `expo-image` or `react-native-fast-image`
- Profile and fix any re-render issues using React DevTools
- Ensure list of 200 people scrolls at 60fps on mid-range Android device

## Acceptance Criteria
- [ ] List of 200 people scrolls at 60fps on Android mid-range
- [ ] Profile photos load from cache after first load (no re-download on scroll)
- [ ] No unnecessary re-renders on list scroll

## Depends on
E4-01
""",
    },

    # =========================================================================
    # CONTACT IMPORT (P1)
    # =========================================================================
    {
        "title": "E3-03: Import from Facebook contacts (P1)",
        "labels": ["epic:networks", "P1", "effort:L"],
        "body": """## Goal
Allow users to import people from their Facebook contacts.

## Requirements
- Authenticate with Facebook Graph API to access contacts
- Display importable friends list; user selects all or a subset
- Import selected as `Person` records with `import_source = 'facebook'`
- Run duplicate detection on import

## Acceptance Criteria
- [ ] Facebook contacts shown and selectable
- [ ] Selected contacts imported as Person records
- [ ] Duplicate detection runs post-import

## Depends on
E4-02
""",
    },
    {
        "title": "E3-04: Import from LinkedIn connections (P1)",
        "labels": ["epic:networks", "P1", "effort:L"],
        "body": """## Goal
Allow users to import people from their LinkedIn connections.

## Requirements
- Authenticate with LinkedIn API
- Display importable connections list; user selects all or a subset
- Import selected as `Person` records with `import_source = 'linkedin'`
- Map LinkedIn fields: name, job title, company
- Run duplicate detection on import

## Acceptance Criteria
- [ ] LinkedIn connections shown and selectable
- [ ] Selected contacts imported with job title and company
- [ ] Duplicate detection runs post-import

## Depends on
E4-02
""",
    },

]


def main():
    if not TOKEN:
        print("Error: GITHUB_TOKEN environment variable is required.")
        print("Usage: GITHUB_TOKEN=<your_pat> python3 create_github_issues.py")
        print("The PAT needs 'repo' scope on bobbywenman/Connect")
        return

    print(f"Creating issues in {REPO}...")
    print()
    print("Step 1: Creating labels...")
    ensure_labels()
    print()
    print("Step 2: Creating issues...")
    created = 0
    failed = 0
    for issue in ISSUES:
        result = create_issue(issue["title"], issue["body"], issue["labels"])
        if result:
            created += 1
        else:
            failed += 1

    print()
    print(f"Done! Created {created} issues, {failed} failed.")
    if failed > 0:
        print("Re-run the script to retry failed issues (duplicates will be skipped by GitHub).")


if __name__ == "__main__":
    main()
