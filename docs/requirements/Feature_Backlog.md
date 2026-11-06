**KNOWTHEM**

Feature Backlog — Organized by Epic

*Priority: P0 = Must Have (MVP)   P1 = Should Have (MVP+)   P2 = Nice to Have (Future)*

*Effort: XS = <1 day   S = 1-2 days   M = 3-5 days   L = 1-2 weeks   XL = 2+ weeks*

### EPIC 1: Foundation & Setup
*App scaffolding, navigation, design system, and backend configuration*

*Priority: P0   |   User Stories: 5*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E1-01 | Set up React Native Expo project with TypeScript | P0 | S | App builds and runs on iOS & Android simulator |
| E1-02 | Configure React Navigation with tab + stack structure | P0 | S | All top-level screens reachable via nav |
| E1-03 | Set up Zustand global state management | P0 | XS | State accessible across screens |
| E1-04 | Configure Supabase (auth, database, storage) | P0 | M | Supabase project connected, env vars set |
| E1-05 | Build core design system (colors, typography, components) | P0 | M | Shared Button, Card, Input, Avatar components available |

### EPIC 2: Authentication & Onboarding
*Social login, email auth, and guided first-run experience*

*Priority: P0   |   User Stories: 8*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E2-01 | Email/password sign up and log in | P0 | S | User can register and sign in with email |
| E2-02 | Google OAuth login | P0 | S | Google sign-in button works on iOS & Android |
| E2-03 | Facebook OAuth login | P0 | S | Facebook sign-in button works |
| E2-04 | Apple Sign In (iOS required) | P0 | S | Apple sign-in works on iOS |
| E2-05 | LinkedIn OAuth login | P1 | S | LinkedIn sign-in works |
| E2-06 | Forgot password / reset via email | P0 | XS | User receives reset email and can set new password |
| E2-07 | Session persistence across app restarts | P0 | XS | User stays logged in after closing app |
| E2-08 | Onboarding flow: choose network type, add first people, connect relationships, prompt study mode | P0 | L | Onboarding completes with 1 network and 1 relationship created |

### EPIC 3: Contact Import
*Import people from phone contacts, Facebook, and LinkedIn*

*Priority: P0   |   User Stories: 5*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E3-01 | Request and handle device contacts permission | P0 | XS | Permission prompt shown; graceful denial handling |
| E3-02 | Browse and select from phone contacts to import | P0 | M | User sees contacts list, can select all or subset, imports selected |
| E3-03 | Import from Facebook contacts | P1 | L | Facebook contacts shown, selectable, imported as Person records |
| E3-04 | Import from LinkedIn connections | P1 | L | LinkedIn connections shown, selectable, imported as Person records |
| E3-05 | Duplicate detection and merge prompt on import | P0 | M | Duplicates flagged, user prompted to merge or skip |

### EPIC 4: Network Management
*Create, customize, and manage named color-coded networks*

*Priority: P0   |   User Stories: 6*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E4-01 | Create a new network with name and type | P0 | S | Network appears in home list after creation |
| E4-02 | Assign color to network (color-coded networks) | P0 | XS | Network displays with chosen color throughout app |
| E4-03 | List all user networks on home screen | P0 | S | Networks show name, type, color, person count |
| E4-04 | Edit network name, type, and color | P0 | XS | Changes save and reflect immediately |
| E4-05 | Delete a network (with confirmation) | P0 | XS | Network and all associated people/relationships deleted |
| E4-06 | Switch between networks | P0 | XS | Tapping a network opens its people list |

### EPIC 5: People Management
*Full CRUD for person profiles with rich detail fields*

*Priority: P0   |   User Stories: 8*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E5-01 | Add person form (name required, all other fields optional) | P0 | M | Person saved; appears in network list |
| E5-02 | Upload or capture profile photo | P0 | S | Photo stored in Supabase Storage; shown on profile |
| E5-03 | Edit all person profile fields | P0 | S | Changes persist after save |
| E5-04 | Person detail screen showing all fields and relationships | P0 | M | Detail screen renders correctly with all data |
| E5-05 | Archive / delete a person | P0 | XS | Person removed from network list |
| E5-06 | Add birthday with reminder flag | P0 | S | Birthday stored; reminder toggle available |
| E5-07 | Add anniversary date with reminder flag | P0 | S | Anniversary stored; reminder toggle available |
| E5-08 | 'New people added this month' smart list | P1 | S | Filtered list shows people with createdAt in current month |

### EPIC 6: Relationship Management
*Connect people with typed relationships and visual badges*

*Priority: P0   |   User Stories: 6*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E6-01 | Add relationship between two people with type selector | P0 | M | Relationship appears on both person detail screens |
| E6-02 | Relationship badges displayed on profiles | P0 | S | Badge/chip shows relationship label prominently |
| E6-03 | Auto-infer inverse relationship (parent/child, sibling) | P0 | S | Creating 'parent of' also creates 'child of' inverse |
| E6-04 | Custom relationship labels | P1 | S | User can type custom label; saved and reusable |
| E6-05 | Edit or remove a relationship | P0 | XS | Edited/removed relationship reflects immediately |
| E6-06 | Duplicate relationship validation | P0 | XS | Warning shown if same relationship already exists |

### EPIC 7: Network Views
*List view, graph view, org-chart, and map view*

*Priority: P0   |   User Stories: 7*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E7-01 | People list view per network (primary view) | P0 | M | List shows avatar, name, key relationship tag, sorted A-Z |
| E7-02 | Filter list by tag, group, or relationship type | P0 | S | Filtered list updates in real time |
| E7-03 | Global search (name, tags, notes, groups) | P0 | M | Results return in <300ms; show photo and network |
| E7-04 | Basic node graph view (togglable per network) | P0 | L | Nodes and edges render; tapping node opens person detail |
| E7-05 | Org-chart mode for Work-type networks | P1 | L | Hierarchical chart renders for manager/report relationships |
| E7-06 | Map view — pin people by location | P1 | L | People with location data appear as pins on map |
| E7-07 | Duplicate detection across all profiles | P0 | M | Potential duplicates surfaced in settings or on person detail |

### EPIC 8: Study Mode
*Flashcard-based review of people in a network*

*Priority: P0   |   User Stories: 6*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E8-01 | Generate study deck: by network, group, tag, or recently added | P0 | M | Deck initializes with correct people |
| E8-02 | Flashcard UI with flip animation (prompt front, answer back) | P0 | M | Flip animation smooth; card shows correct info |
| E8-03 | Confidence rating per card (Knew / Sort of / Did not know) | P0 | S | Rating recorded; advances to next card |
| E8-04 | Session completion screen with summary stats | P0 | S | Shows total cards, breakdown by confidence |
| E8-05 | Study session history screen | P1 | S | Past sessions listed with date and score summary |
| E8-06 | Event-scoped study deck | P0 | S | Deck generates from event's associated people |

### EPIC 9: Event Prep Mode
*Create events, associate people, and launch review decks*

*Priority: P0   |   User Stories: 4*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E9-01 | Create event (name, date, location) | P0 | S | Event saved and listed in network |
| E9-02 | Associate people with event | P0 | S | Multi-select people from network to attach to event |
| E9-03 | Launch event-scoped study deck | P0 | XS | Deck contains only event attendees |
| E9-04 | Event list and event detail screen | P0 | S | Events browsable; detail shows attendees and date |

### EPIC 10: Notifications & Reminders
*Birthday, anniversary, and activity reminders*

*Priority: P0   |   User Stories: 4*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E10-01 | Request push notification permissions | P0 | XS | Permission prompt shown on first birthday added |
| E10-02 | Birthday reminder notifications (configurable lead time) | P0 | M | Notification fires on correct day or N days before |
| E10-03 | Anniversary reminder notifications | P0 | M | Notification fires on anniversary date or N days before |
| E10-04 | Notification settings screen (enable/disable, lead time) | P1 | S | User can toggle each reminder type globally |

### EPIC 11: Polish & Quality
*Empty states, accessibility, error handling, performance*

*Priority: P1   |   User Stories: 6*


| ID | User Story | Priority | Effort | Key Acceptance Criteria |
|---|---|---|---|---|
| E11-01 | Empty states for all screens | P0 | S | Each empty list has helpful illustration and CTA |
| E11-02 | Accessibility: screen reader labels (VoiceOver / TalkBack) | P0 | M | All interactive elements have accessible labels |
| E11-03 | Accessibility: Dynamic Type / large font support | P0 | S | UI scales correctly at all iOS text size settings |
| E11-04 | Error handling: network errors, auth errors, upload failures | P0 | M | User-friendly error messages shown; no unhandled crashes |
| E11-05 | Performance tuning: list virtualization, image caching | P1 | M | List of 200 people scrolls at 60fps |
| E11-06 | Merge profiles tool | P1 | M | User can merge two duplicate profiles into one canonical record |

