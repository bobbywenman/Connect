**KNOWTHEM**

Product Requirements Document

*Network-First Relationship Mapping & Social Memory App*

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Draft — For Engineering Review |
| Date | March 2026 |
| Platform | React Native (iOS & Android) |
| App Name | KnowThem |

## 1. Product Overview

KnowThem is a mobile application that helps users digitally represent and remember the people in their network. A network might be a family tree, a work team, a group of friends from around the world, a church group, a sports team, or a professional contact list. Users create profiles for people, define relationships between them, and then study those connections through a flashcard-style review mode — making them more prepared and confident for any social situation.

### 1.1 Product Vision

Help users feel more socially prepared and connected by turning their real-world relationships into a structured, searchable, and study-friendly digital network.

### 1.2 App Name

KnowThem — chosen because the differentiator is not just mapping people, it is remembering and understanding them. Alternative names considered: KinMap, PeopleMap, Relate, Netly.

## 2. Core User Problem

People struggle to remember names, relationships, family ties, group memberships, and personal details about the people in their lives. This creates awkwardness and anxiety before:
- Holidays and family gatherings
- Weddings and reunions
- Networking events and conferences
- Onboarding into new teams
- Meeting a partner's family
- Joining a new social circle

Most people know of their network, but do not have an easy way to visualize it, recall who is connected to whom, or review details before social situations.

## 3. Target Users

### 3.1 Primary Users
- Someone learning a partner's or spouse's family
- Someone organizing a family tree or extended family network
- Professionals trying to remember coworkers, clients, or event contacts
- People preparing for reunions, holidays, or networking events
- Anyone who wants to study and retain names and relationships

### 3.2 Secondary Users
- Parents documenting extended family for their children
- Team leads mapping organizational or team relationships
- Students mapping classmates, professors, or club members
- Casual genealogy users who want simpler tools than full ancestry apps

## 4. Product Principles
- Network-first, not family-first — supports any type of relationship network
- List view is primary — graph view is a powerful secondary layer
- Study mode is a core differentiator — not just a contact list
- Single-user for MVP — collaboration comes later
- Progressive detail entry — adding people must feel fast and lightweight

## 5. MVP Feature Scope

### 5.1 Authentication & Onboarding
- Sign up and log in via Google, Facebook, LinkedIn, Apple, and email/password
- Password reset flow
- Persistent session across app restarts
- Onboarding flow: choose network type, create first network, add first people, connect relationships, view network, prompted to try study mode

### 5.2 Contact Import
- Sync contacts from phone contacts (iOS/Android native)
- Import from Facebook contacts
- Import from LinkedIn connections
- Select-all or sub-select individuals from each data source before importing
- Duplicate detection during import with merge suggestions

### 5.3 Network Management
- Create one or more named networks
- Assign a type: Family, Friends, Work, Custom
- Assign a color to each network (color-coded networks)
- Rename, edit, and delete networks
- Switch between networks

### 5.4 Person Profiles
- First name (required)
- Last name, preferred name / nickname
- Profile photo (camera or gallery upload)
- Gender / pronouns
- Birthdate or age range (with birthday reminder support)
- Anniversary date (with anniversary reminder support)
- Location / city
- Notes (free-form)
- Tags and group membership
- Fun facts, interests, job title, hometown, conversation starters

### 5.5 Relationship Mapping
- Connect two people with a defined relationship type
- Supported types: parent, child, sibling, spouse/partner, cousin, aunt/uncle, friend, coworker, manager, mentor, custom
- Relationship badges displayed on profiles
- Inverse relationships inferred where applicable (parent/child, sibling/sibling)
- Edit or remove existing relationships
- Duplicate relationship warnings

### 5.6 Network Views
- People list view (primary view per network)
- Person detail view with direct relationship list
- Basic graph/node view (secondary, togglable)
- Org-chart mode for Work-type networks
- Map view — pin people by geographic location
- Filter by tag, group, or network
- Search by name, notes, tags, or groups

### 5.7 Study Mode
- Generate a study deck from: all people, one network, one tag/group, or recently added people
- Flashcard UI: prompt on front, answer/details on back
- Prompt examples: 'Who is this?', 'How is Sarah connected to you?', 'What does John do?'
- Confidence rating per card: Knew it / Sort of knew it / Did not know it
- Session history and basic review stats

### 5.8 Event Prep Mode
- Create a named event with date and location
- Associate people with that event
- Launch a study deck scoped to that event's attendees

### 5.9 Notifications & Reminders
- Birthday reminders — notify user on or before a person's birthday
- Anniversary reminders — notify user for relationship anniversaries

### 5.10 Discovery & Organization
- 'New people added this month' smart list
- Duplicate detection across all profiles with merge tool
- Merge profiles: combine two duplicate entries into one

## 6. Functional Requirements

### 6.1 Authentication
- Users can create accounts via Google, Facebook, LinkedIn, Apple, or email/password
- Users can sign in and sign out
- Users can reset password via email
- Sessions persist across app restarts

### 6.2 Network Management
- Users can create, rename, recolor, and delete networks
- Users can assign a type (Family, Friends, Work, Custom) to each network
- Users can switch between networks from a home/hub screen

### 6.3 Person Management
- Users can add a person manually via a form
- Users can import people from phone contacts, Facebook, or LinkedIn
- Users can select a subset of contacts to import from each source
- Duplicate detection runs on import and on manual creation
- Users can edit all profile fields
- Users can archive or delete a person
- Users can upload or take a profile photo

### 6.4 Relationship Management
- Users can connect any two people with a relationship type
- Users can add custom relationship labels
- Inverse relationships are auto-inferred where logical
- Users can edit or remove relationships
- Duplicate relationship validation prevents accidental doubles

### 6.5 Views & Navigation
- People list per network is the default primary view
- Graph view is togglable per network
- Org-chart mode available for Work networks
- Map view displays people pinned to their location
- Tapping a person opens their detail page
- Person detail shows all direct connections with relationship labels and badges

### 6.6 Study Mode
- Users can generate a deck by: network, tag/group, recently added, or event
- Cards show one prompt at a time with a reveal interaction
- Confidence rating recorded per card
- Session results saved and viewable in history

### 6.7 Notifications
- Birthday reminder push notification (configurable lead time: same day, 1 day, 1 week)
- Anniversary reminder push notification (same lead time options)
- 'New people added this month' summary notification (optional)

### 6.8 Search
- Global search by name, tags, notes, groups
- Results scannable with photo and network label

## 7. Non-Functional Requirements

### 7.1 Performance
- List and detail views load in under 1 second for networks up to 500 people
- Search returns results in under 300ms
- Graph view remains usable for networks up to 100 nodes

### 7.2 Security & Privacy
- All user data private by default
- Authentication via established OAuth providers
- Personally identifiable information encrypted at rest
- No data shared with third parties without consent

### 7.3 Usability
- Adding a person should take under 60 seconds
- Study mode should be launchable in 2 taps from any network
- App must feel simple for non-technical users

### 7.4 Accessibility
- Larger text support (Dynamic Type on iOS, sp units on Android)
- Screen reader compatible labels (VoiceOver / TalkBack)
- Minimum 4.5:1 contrast ratio
- Tap targets minimum 44x44pt

### 7.5 Scalability
- Data model supports future shared/collaborative networks
- Architecture supports additional relationship types and metadata
- Backend supports growing user base without re-architecture

## 8. Data Model

### 8.1 User
- id, name, email, authProvider, authMetadata, settings, createdAt

### 8.2 Network
- id, ownerUserId, name, type (Family|Friends|Work|Custom), color (hex), description, createdAt, updatedAt

### 8.3 Person
- id, networkId, firstName, lastName, preferredName, photoUrl, pronouns
- birthdate, anniversaryDate, location (city, lat, lng)
- notes, tags[], groups[], funFacts, jobTitle, hometown, conversationStarters
- importSource (manual|contacts|facebook|linkedin), createdAt, updatedAt

### 8.4 Relationship
- id, networkId, sourcePersonId, targetPersonId
- relationshipType, inverseRelationshipType, badge, notes, createdAt, updatedAt

### 8.5 Event
- id, networkId, name, date, location, description

### 8.6 EventPerson
- eventId, personId

### 8.7 StudySession & StudyResult
- StudySession: id, userId, networkId, deckType, startedAt, endedAt
- StudyResult: id, studySessionId, personId, result (knew|sortof|didnt), responseTimeMs

## 9. Out of Scope for MVP
- Advanced genealogy computation or kinship inference beyond direct relationships
- Full ancestry-style timelines
- Multi-user real-time collaboration / shared networks
- Public social networking or messaging
- AI auto-population from public internet sources
- Desktop-grade graph editing tools

## 10. Risks & Complexity Areas
- Relationship modeling complexity — family relationships get complicated quickly. MVP stores direct relationships only.
- Graph UX on mobile — large networks get cluttered. Start with limited, zoomable graphs.
- Too many fields slow adoption — use progressive detail entry. Only first name required.
- Study mode must feel useful quickly — require at least 3 people with relationships to unlock.
- Contact import permissions — iOS/Android permissions flows must be handled gracefully with clear user messaging.

## 11. Recommended Tech Stack
- React Native with Expo
- TypeScript
- React Navigation
- Zustand or Redux Toolkit
- Supabase (auth + database + storage)
- TanStack Query (React Query)
- Expo Image Picker, Expo Contacts, Expo Notifications
- React Native Maps (for map view)
- Reanimated + Gesture Handler (for flashcard flip animation)
- D3 or React Native Graph Kit (for graph view, post-MVP polish)

## 12. Future Feature Ideas
- Relationship path finder: 'How is Alex connected to me?'
- AI-assisted memory cards: 'Ask Mark about his recent move'
- Shared/collaborative networks for couples or families
- Gamification: streaks, confidence meter, review scores
- Export network as PDF or image
- Offline mode
- Timeline of life events per person
- 'People I haven't reviewed recently' smart list
- Pinned / favorite people
- Quick-add templates for family units (e.g., add couple + kids in one flow)

