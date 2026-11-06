**KNOWTHEM**

Agent-Ready Engineering Tickets

*Detailed tickets with requirements, acceptance criteria, and technical notes — ready to feed directly to an AI coding agent*

## How to Use These Tickets

Each ticket is self-contained and designed to be fed directly to an AI coding agent. Tickets include: a clear goal, context, explicit requirements, numbered acceptance criteria, and technical implementation notes. Feed one ticket at a time. When a ticket references a previous ticket, ensure that ticket is complete before starting the next.

## Epic 1: Foundation

### E1-01  Project Scaffolding
*Epic: Epic 1: Foundation   |   Priority: P0   |   Effort: S*


**GOAL**

Initialize the KnowThem React Native Expo project with TypeScript, folder structure, and core dependencies.

**CONTEXT**

This is the first ticket. All other tickets depend on it.

**REQUIREMENTS**
- Initialize Expo project with TypeScript template: npx create-expo-app@latest KnowThem --template blank-typescript
- Configure absolute imports using tsconfig paths (e.g., @/components, @/screens, @/store)
- Install core dependencies: react-navigation, @react-navigation/native-stack, @react-navigation/bottom-tabs
- Install Expo dependencies: expo-image-picker, expo-contacts, expo-notifications, expo-secure-store
- Install utility libraries: zustand, @tanstack/react-query, date-fns
- Set up ESLint and Prettier with standard React Native rules
- Create folder structure: /app, /components, /screens, /store, /hooks, /utils, /types, /constants
- Create a placeholder App.tsx that renders a 'KnowThem' text on screen

**ACCEPTANCE CRITERIA**
- App runs on iOS simulator without errors
- App runs on Android emulator without errors
- Absolute imports work: importing from @/components resolves correctly
- ESLint runs clean with no errors on the initial codebase
- Folder structure matches the specified layout

**TECHNICAL NOTES**
- Use Expo SDK 51 or latest stable
- Node version: 18+ required
- Use yarn or npm consistently — pick one and document in README

### E1-02  Design System & Core Components
*Epic: Epic 1: Foundation   |   Priority: P0   |   Effort: M*


**GOAL**

Build the shared design system including color tokens, typography scale, and reusable UI components.

**CONTEXT**

All screens will import from this design system. Establish it early so subsequent tickets use consistent styles.

**REQUIREMENTS**
- Create /constants/colors.ts with: primary (#1E3A5F), accent (#2980B9), background (#FFFFFF), surface (#F5F5F5), text (#111111), textSecondary (#555555), error (#C0392B), success (#1A7340)
- Create /constants/typography.ts with: sizes (xs=12, sm=14, base=16, lg=20, xl=24, 2xl=30), weights (regular, medium, bold), font family (System default)
- Build <Button> component: variants (primary, secondary, ghost, danger), sizes (sm, md, lg), loading state, disabled state
- Build <TextInput> component: label, placeholder, error message, multiline support, secureTextEntry support
- Build <Avatar> component: displays profile photo or initials fallback; sizes (sm=32, md=48, lg=64, xl=96)
- Build <Card> component: white surface with subtle shadow, optional onPress
- Build <Badge> component: small pill label with background color and text
- Build <EmptyState> component: accepts icon, title, subtitle, and optional CTA button
- Export all components from /components/index.ts

**ACCEPTANCE CRITERIA**
- All components render in isolation without errors
- Button shows loading spinner when isLoading=true
- Avatar shows initials when no photoUrl provided
- EmptyState renders with and without CTA button
- All color and typography constants are importable

**TECHNICAL NOTES**
- Use StyleSheet.create for all styles — no inline style objects
- All components must be TypeScript typed with exported prop interfaces
- Test on both iOS and Android — shadows behave differently per platform

### E1-03  Supabase Configuration
*Epic: Epic 1: Foundation   |   Priority: P0   |   Effort: M*


**GOAL**

Configure Supabase as the backend: initialize client, set up environment variables, and create the core database schema.

**CONTEXT**

All data storage and auth flows depend on Supabase being configured. Complete this before Epic 2.

**REQUIREMENTS**
- Install @supabase/supabase-js
- Create /utils/supabase.ts that initializes and exports the Supabase client using EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables
- Create .env.example file documenting required env vars
- Create Supabase database tables via SQL migration: users (id, email, name, avatar_url, created_at), networks (id, owner_user_id, name, type, color, description, created_at, updated_at), persons (id, network_id, first_name, last_name, preferred_name, photo_url, pronouns, birthdate, anniversary_date, location_city, location_lat, location_lng, notes, tags, job_title, hometown, fun_facts, conversation_starters, import_source, created_at, updated_at), relationships (id, network_id, source_person_id, target_person_id, relationship_type, inverse_type, badge_label, notes, created_at, updated_at), events (id, network_id, name, event_date, location, description, created_at), event_persons (event_id, person_id), study_sessions (id, user_id, network_id, deck_type, started_at, ended_at), study_results (id, session_id, person_id, result, response_time_ms)
- Enable Row Level Security (RLS) on all tables — users can only access their own data
- Create Supabase Storage bucket named 'avatars' for profile photos
- Write a /hooks/useSupabase.ts hook that returns the initialized client

**ACCEPTANCE CRITERIA**
- Supabase client initializes without errors
- All tables exist in Supabase with correct columns and types
- RLS policy prevents user A from reading user B's networks
- Avatars bucket exists and is accessible
- Environment variables load correctly via Expo config

**TECHNICAL NOTES**
- Never commit actual .env file — only .env.example
- Use Supabase SQL editor to run migration scripts
- tags column on persons should be text[] (Postgres array type)
- Use uuid as primary key type on all tables

## Epic 2: Authentication

### E2-01  Email/Password Authentication Screens
*Epic: Epic 2: Authentication   |   Priority: P0   |   Effort: S*


**GOAL**

Build sign up, log in, and forgot password screens using Supabase Auth with email/password.

**CONTEXT**

Prerequisite: E1-03 (Supabase configured). These screens are the app entry point for new users.

**REQUIREMENTS**
- Build <SignUpScreen>: fields for name, email, password, confirm password; submit calls supabase.auth.signUp(); on success navigate to onboarding
- Build <LoginScreen>: fields for email and password; submit calls supabase.auth.signInWithPassword(); on success navigate to home
- Build <ForgotPasswordScreen>: email field; submit calls supabase.auth.resetPasswordForEmail(); show confirmation message
- Add form validation: required fields, email format, password min 8 chars, passwords match
- Show inline error messages below each invalid field
- Show loading state on submit buttons during async calls
- Add navigation links: Login -> Forgot Password, Login -> Sign Up, Sign Up -> Login
- Store session using expo-secure-store via Supabase's custom storage adapter

**ACCEPTANCE CRITERIA**
- User can sign up with valid email/password and is navigated to onboarding
- Duplicate email shows Supabase error message to user
- User can log in with correct credentials and is navigated to home
- Wrong password shows error message
- Forgot password sends reset email (verify via Supabase dashboard)
- Session persists after closing and reopening the app
- All validation errors show inline below the relevant field

**TECHNICAL NOTES**
- Use Supabase's AsyncStorage / SecureStore adapter for session persistence
- Supabase signUp on mobile does NOT require email confirmation by default — confirm this setting in Supabase dashboard
- Use Controller from react-hook-form for form state management

### E2-02  Google & Apple OAuth Login
*Epic: Epic 2: Authentication   |   Priority: P0   |   Effort: S*


**GOAL**

Add Google and Apple Sign-In to the login screen using Supabase's OAuth providers.

**CONTEXT**

Apple Sign-In is required by Apple App Store guidelines for iOS apps that offer social login. Google is the most common OAuth provider.

**REQUIREMENTS**
- Add 'Continue with Google' button to LoginScreen and SignUpScreen
- Implement Google OAuth using supabase.auth.signInWithOAuth({ provider: 'google' }) with Expo WebBrowser
- Add 'Sign in with Apple' button (iOS only, hide on Android)
- Implement Apple Sign-In using expo-apple-authentication and supabase.auth.signInWithIdToken
- On successful OAuth, navigate to home if existing user, or to onboarding if new user (check if user has any networks)
- Handle OAuth cancellation gracefully — return to login screen without error

**ACCEPTANCE CRITERIA**
- Google login opens browser, authenticates, and returns user to app
- Apple login works on iOS device/simulator
- Apple button is not visible on Android
- Cancelled OAuth returns to login screen without showing an error
- New OAuth user is sent to onboarding; returning user goes to home

**TECHNICAL NOTES**
- Configure Google and Apple providers in Supabase Authentication dashboard
- Use expo-web-browser for Google OAuth redirect handling
- Apple Sign In requires a real device or Simulator with iOS 13+; not available in Expo Go
- Add appropriate URL scheme to app.json for OAuth redirect

### E2-03  Onboarding Flow
*Epic: Epic 2: Authentication   |   Priority: P0   |   Effort: L*


**GOAL**

Build a guided multi-step onboarding flow that walks new users through creating their first network, adding people, and connecting relationships.

**CONTEXT**

Onboarding only appears once — on first login. After completion, set a flag in the user's record to skip it on subsequent logins.

**REQUIREMENTS**
- Step 1 — Welcome: App name, tagline, and 'Get Started' button
- Step 2 — Create First Network: Name input + type picker (Family / Friends / Work / Custom) + color picker (8 preset colors). Save creates first Network record.
- Step 3 — Add Your First People: Prompt user to add 2-3 people. Each addition opens the Add Person form (first name required). Show added people as avatar chips below the prompt.
- Step 4 — Connect Relationships: For each person added, prompt to connect with the 'Add Relationship' flow. Show a simplified relationship picker.
- Step 5 — See Your Network: Show a preview of the list view with their newly added people.
- Step 6 — Try Study Mode: Prompt 'Want to test yourself?' with a 'Start Studying' CTA.
- Add a progress indicator (dots or step counter) at the top
- Allow 'Skip' on steps 3-6
- On completion, set onboarding_complete = true in the users table

**ACCEPTANCE CRITERIA**
- New user sees onboarding after first sign up
- Returning user does NOT see onboarding
- Each step advances correctly with valid input
- Skipping steps 3-6 completes onboarding and navigates to home
- First network is saved to Supabase by end of onboarding
- People added during onboarding appear in the network's list view
- Progress indicator reflects current step

**TECHNICAL NOTES**
- Use a step-based local state machine (currentStep: number) rather than separate screens/routes
- Animate step transitions with a horizontal slide
- The Add Person form used here should be the same component used throughout the app

## Epic 3: Network Management

### E3-01  Home Screen — Network List
*Epic: Epic 3: Network Management   |   Priority: P0   |   Effort: M*


**GOAL**

Build the home screen that displays all user networks with color coding, and provides entry points to create new networks.

**CONTEXT**

This is the app's main hub after login. The design should make networks visually distinct via their assigned color.

**REQUIREMENTS**
- Fetch all networks for the current user from Supabase on mount
- Display each network as a card showing: color swatch/bar, network name, type label, person count
- Tapping a network navigates to that network's People List screen (pass networkId)
- Show a + FAB (Floating Action Button) to create a new network
- Show <EmptyState> with 'Create your first network' CTA when no networks exist
- Show loading skeleton while fetching
- Pull-to-refresh support

**ACCEPTANCE CRITERIA**
- Networks list loads and displays within 1 second
- Each network card shows correct color, name, type, and person count
- Tapping a card navigates to that network's people list
- + FAB opens the Create Network flow
- Empty state renders with CTA when user has no networks
- Pull-to-refresh re-fetches and updates the list

**TECHNICAL NOTES**
- Use useQuery (TanStack Query) to manage fetch/cache state
- Person count can be fetched via Supabase count query or stored as a denormalized field
- Color bar should span the full left edge of the card (3-4px wide vertical bar)

### E3-02  Create & Edit Network
*Epic: Epic 3: Network Management   |   Priority: P0   |   Effort: S*


**GOAL**

Build the create network form (also used for editing) with name, type, and color picker.

**CONTEXT**

Used both from the Home Screen FAB (create) and from a network settings screen (edit).

**REQUIREMENTS**
- Form fields: Network Name (required, max 50 chars), Type (picker: Family | Friends | Work | Custom), Color (8 preset swatches: blue, green, purple, red, orange, teal, pink, gray)
- On create: POST to Supabase networks table with ownerUserId = current user
- On edit: PATCH existing network record
- Show validation error if name is empty
- After save, navigate back and refresh networks list
- Delete network option on edit screen (with confirmation alert showing 'This will delete all people and relationships in this network')

**ACCEPTANCE CRITERIA**
- Network saves with correct name, type, and color
- Empty name shows validation error and does not submit
- Created network appears immediately in the home screen network list
- Color picker selection updates a preview swatch
- Delete confirmation alert appears before deletion
- Deleted network and all its persons/relationships are removed from Supabase

**TECHNICAL NOTES**
- Use a bottom sheet or modal screen for the form
- Supabase cascade delete should handle removing related persons and relationships when a network is deleted — configure ON DELETE CASCADE in the schema

## Epic 4: People Management

### E4-01  People List Screen (Per Network)
*Epic: Epic 4: People Management   |   Priority: P0   |   Effort: M*


**GOAL**

Build the primary list view for a network — shows all people sorted alphabetically with avatar, name, and relationship summary.

**CONTEXT**

This is the primary screen users spend the most time in. It must feel fast and clean.

**REQUIREMENTS**
- Fetch all persons in the selected network from Supabase
- Display as a scrollable list: Avatar (photo or initials), full name (preferred name in parentheses if set), primary relationship label (e.g., 'Cousin', 'Manager')
- Sort alphabetically by last name, then first name
- Show network color as a thin header bar at the top
- Search bar at top of screen — filters list as user types (client-side filtering on name, nickname, tags)
- Filter button opens a filter sheet: by tag, by group, by relationship type
- + FAB to add a new person to this network
- Tapping a person navigates to Person Detail screen
- <EmptyState> with 'Add your first person' CTA when network has no people

**ACCEPTANCE CRITERIA**
- List renders all persons in the network sorted A-Z by last name
- Search filters list in real time without API call
- Tapping a person opens their detail screen
- + FAB opens Add Person form pre-filled with the current networkId
- Empty state shows when no people exist in the network
- List of 100 people renders without jank

**TECHNICAL NOTES**
- Use FlashList (from @shopify/flash-list) instead of FlatList for better performance
- Initials fallback for Avatar: first letter of firstName + first letter of lastName
- Primary relationship is the first relationship record where sourcePersonId = this person — may be null

### E4-02  Add / Edit Person Form
*Epic: Epic 4: People Management   |   Priority: P0   |   Effort: M*


**GOAL**

Build the add/edit person form with all profile fields, organized into collapsible sections for progressive disclosure.

**CONTEXT**

First name is the only required field. All other fields are optional and should feel lightweight to skip.

**REQUIREMENTS**
- Section 1 — Basic Info (always expanded): First Name (required), Last Name, Preferred Name/Nickname, Profile Photo (tap to pick from gallery or camera)
- Section 2 — Personal (collapsed by default): Gender/Pronouns, Birthdate (date picker, toggle birthday reminder), Anniversary Date (date picker, toggle reminder)
- Section 3 — Location: City text field, optional lat/lng via 'Use current location' button
- Section 4 — Work: Job Title, Company, Department
- Section 5 — Notes & Tags: Notes (multiline), Tags (chip input — type and press enter to add), Fun Facts, Conversation Starters
- On save: POST to Supabase persons table with networkId
- On edit: PATCH existing person record
- Cancel button dismisses without saving
- Run duplicate name check on save — if a person with same first+last name exists in this network, show a warning alert with option to continue or cancel

**ACCEPTANCE CRITERIA**
- Form saves person with only first name filled (all other fields null/empty)
- All optional fields save correctly when filled
- Profile photo uploads to Supabase Storage and photo_url is saved
- Birthdate saves and birthday reminder toggle state is saved
- Duplicate name warning appears when same name exists in network
- Cancel dismisses without saving any data
- Editing pre-populates all existing field values

**TECHNICAL NOTES**
- Use react-hook-form for form state management
- Profile photo: use expo-image-picker; resize to max 500x500 before upload to reduce storage costs
- Date picker: use @react-native-community/datetimepicker
- Tags chip input: render each tag as a removable chip; pressing comma or return adds the tag

### E4-03  Person Detail Screen
*Epic: Epic 4: People Management   |   Priority: P0   |   Effort: M*


**GOAL**

Build the person detail screen showing all profile information and all direct relationships.

**CONTEXT**

This is the most important read-only screen in the app. It should feel like a clean, comprehensive profile.

**REQUIREMENTS**
- Header: large Avatar, full name, preferred name (if different), pronouns
- Relationship badges section: horizontal scrollable row of <Badge> chips for each relationship (e.g., 'Cousin of Maria', 'Manager of John')
- Info section: Birthday (with days-until indicator), Anniversary, Location, Job Title
- Notes section: display full notes text
- Tags section: display all tags as chips
- Fun Facts and Conversation Starters sections (if populated)
- Connections section: list all people this person is connected to, with relationship label and their avatar; tapping a connection opens their detail screen
- Edit button in header navigates to Edit Person form
- Three-dot menu: Archive, Delete
- Floating 'Add Relationship' button at bottom

**ACCEPTANCE CRITERIA**
- All populated fields display correctly
- Empty fields are hidden (not shown as blank rows)
- Relationship badges render for all existing relationships
- Connections list shows correct people and relationship labels
- Tapping a connection opens that person's detail screen
- Edit button pre-populates form with current data
- Delete shows confirmation and removes person from Supabase

**TECHNICAL NOTES**
- Use ScrollView with sticky header for the avatar/name section
- Days-until-birthday: calculate from today to next occurrence of birthdate (handle year rollover)
- Connections query: SELECT relationships WHERE source_person_id = id OR target_person_id = id, then join persons table for each connected person

## Epic 5: Relationship Management

### E5-01  Add Relationship Flow
*Epic: Epic 5: Relationship Management   |   Priority: P0   |   Effort: M*


**GOAL**

Build the flow to connect two people in a network with a typed relationship.

**CONTEXT**

This can be launched from the Person Detail screen (connecting this person to another) or from the People List screen.

**REQUIREMENTS**
- Step 1 — Select Target Person: searchable list of all other people in the same network; show avatar and name
- Step 2 — Select Relationship Type: categorized picker with common options: Family (parent, child, sibling, spouse/partner, grandparent, grandchild, aunt/uncle, niece/nephew, cousin), Professional (manager, direct report, mentor, mentee, coworker), Social (friend, acquaintance), Other (custom)
- Custom relationship: if user selects 'Custom', show a text input for the label
- Step 3 — Review and confirm: show 'Person A is [relationship] of Person B' summary
- On save: INSERT into relationships table; also insert inverse relationship (e.g., if 'parent of', create 'child of' in reverse direction)
- Check for duplicate relationship before saving — if same pair + type exists, show warning
- After save, navigate back to Person Detail with refreshed relationships

**ACCEPTANCE CRITERIA**
- User can select any other person in the network as the target
- All predefined relationship types are available in the picker
- Custom label can be entered and saves correctly
- Inverse relationship record is created automatically
- Duplicate relationship shows a warning and does not create a duplicate
- New relationship appears on both person detail screens after save

**TECHNICAL NOTES**
- The inverse type map: parent->child, child->parent, sibling->sibling, spouse->spouse, manager->direct report, mentor->mentee, aunt/uncle->niece/nephew, grandparent->grandchild
- For relationships with no natural inverse (friend, coworker, acquaintance), create the same relationship type in both directions
- Use a bottom sheet for steps to avoid full navigation push

## Epic 6: Study Mode

### E6-01  Study Deck Generation
*Epic: Epic 6: Study Mode   |   Priority: P0   |   Effort: M*


**GOAL**

Build the study deck selection and generation flow — allowing users to choose what to study and launch a flashcard session.

**CONTEXT**

Users can study any subset of their network. The deck generator fetches the selected people and creates a randomized card sequence.

**REQUIREMENTS**
- Study entry screen: 'What do you want to study?' with options: Entire network, By group/tag (show tag picker), Recently added (last 30 days), Specific event (show event picker)
- After selection, show deck preview: 'X people in this deck' with avatar strip and 'Start Studying' button
- Generate card prompts for each person: 'Who is this?' (show photo, answer is name), 'How is [Name] related to you?' (answer is relationship path), 'What does [Name] do?' (if job title exists), 'What group is [Name] part of?' (if tags exist)
- Randomize card order
- Create a StudySession record in Supabase when user taps 'Start Studying'
- Pass the deck (array of person + prompt pairs) to the FlashcardScreen

**ACCEPTANCE CRITERIA**
- All deck types generate correctly with the right people
- Deck with 0 people shows an empty state and does not navigate to flashcards
- Card prompts are generated based on available data (no 'What do you do?' prompt if job title is null)
- Card order is randomized (not alphabetical)
- Study session record is created in Supabase on start

**TECHNICAL NOTES**
- Pass deck as navigation param or store in Zustand study store to avoid prop drilling
- For 'recently added': filter by created_at >= now() - 30 days

### E6-02  Flashcard Screen
*Epic: Epic 6: Study Mode   |   Priority: P0   |   Effort: M*


**GOAL**

Build the flashcard UI with flip animation, confidence rating, and session completion.

**CONTEXT**

This is one of the most important UX moments in the app — the flip and confidence rating must feel smooth and satisfying.

**REQUIREMENTS**
- Show one card at a time. Card front: prompt text + person photo (if 'Who is this?' prompt). Card back: answer + person's full details relevant to the prompt.
- Tap card or 'Reveal' button flips card with a 3D horizontal flip animation (180 degree Y-axis rotation)
- After flip, show three confidence buttons: 'Knew it' (green), 'Sort of' (orange), 'Did not know' (red)
- On confidence selection: record StudyResult in Supabase (personId, result, responseTimeMs), advance to next card
- Progress indicator at top: 'Card 3 of 12'
- After last card: navigate to Session Complete screen
- Session Complete screen: 'Nice work!' header, donut chart or simple bar showing knew/sort-of/did-not counts, 'Study Again' and 'Done' buttons
- 'Study Again' restarts with only the 'did not know' and 'sort of' cards

**ACCEPTANCE CRITERIA**
- Card flip animation runs at 60fps without jank
- Front and back do not show simultaneously during flip
- Confidence buttons appear only after card is flipped
- StudyResult record saved for each card
- Progress indicator updates correctly
- Session Complete screen shows accurate counts
- 'Study Again' deck contains only low-confidence cards

**TECHNICAL NOTES**
- Use react-native-reanimated for the flip animation — interpolate rotateY from 0 to 180deg; use backfaceVisibility: 'hidden' on both sides
- responseTimeMs: measure from card display to confidence button tap using Date.now()
- Update StudySession.endedAt in Supabase when session completes

## Epic 7: Notifications

### E7-01  Birthday & Anniversary Reminders
*Epic: Epic 7: Notifications   |   Priority: P0   |   Effort: M*


**GOAL**

Implement push notification reminders for birthdays and anniversaries stored on person profiles.

**CONTEXT**

Reminders are scheduled locally using Expo Notifications. They are created/updated whenever a person's birthday or anniversary is saved.

**REQUIREMENTS**
- On app startup, call Notifications.requestPermissionsAsync(); store permission status in global state
- When a person's birthdate is saved with reminder enabled: schedule a repeating annual local notification for that date at 9am. Notification body: '[Name]'s birthday is today!' (or 'in 3 days' if lead time is set)
- When a person's anniversary is saved with reminder enabled: same logic with '[Name]'s anniversary is [today/in X days]!'
- When a person is deleted or reminder is toggled off: cancel any existing scheduled notifications for that person
- Tapping a notification deep links to that person's detail screen
- Notification settings screen (in app Settings): global toggle for birthday reminders, global toggle for anniversary reminders, lead time picker (same day, 1 day before, 3 days before, 1 week before)

**ACCEPTANCE CRITERIA**
- Permission request appears on first birthday with reminder enabled
- Birthday notification fires at correct time on the correct date
- Toggling reminder off cancels the notification
- Deleting a person cancels their notifications
- Tapping notification opens correct person detail screen
- Changing lead time setting reschedules all existing birthday/anniversary notifications

**TECHNICAL NOTES**
- Use expo-notifications scheduleNotificationAsync with a CalendarTrigger for annual repeating
- Store Expo notification IDs on the person record (notification_id_birthday, notification_id_anniversary) so they can be cancelled
- Deep link: configure Expo Linking to handle notification tap and navigate to /person/:id
- Test on physical device — simulators may not fire local notifications reliably

## Epic 8: Polish & Accessibility

### E8-01  Duplicate Detection & Profile Merge
*Epic: Epic 8: Polish   |   Priority: P0   |   Effort: M*


**GOAL**

Detect potential duplicate person profiles within a network and provide a merge tool to combine them.

**CONTEXT**

Duplicates most commonly arise from contact import combined with manual entry. This feature protects data quality.

**REQUIREMENTS**
- Run duplicate detection when: a person is manually saved (check same network for same first+last name), after a contact import batch completes
- Duplicate detection algorithm: exact match on firstName + lastName (case-insensitive) within the same network
- When duplicates are found: show a 'Potential Duplicates' banner on the Person Detail screen with 'Review' button, OR surface in a Duplicates section in Settings
- Merge screen: show both profiles side by side; for each field, show which value to keep (radio selector, default to non-empty value); merge button combines into one record
- On merge: keep the selected field values, merge tags arrays, transfer all relationships from both persons to the merged record, delete the duplicate record
- After merge: navigate to the surviving person's detail screen

**ACCEPTANCE CRITERIA**
- Duplicate pair detected for same first+last name in same network
- Merge screen shows both profiles' data
- After merge, one record remains with correct combined data
- All relationships from both profiles are transferred to the merged record
- Duplicate record is deleted from Supabase
- No false positives for people with same first name but different last name

**TECHNICAL NOTES**
- Run duplicate check as a background async operation after save — do not block the form save
- Relationship transfer: UPDATE relationships SET source_person_id = survivingId WHERE source_person_id = duplicateId; same for target_person_id

