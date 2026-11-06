# Roadmap

Every piece of work is a GitHub issue titled `KT-xx: ...` in [bobbywenman/Connect](https://github.com/bobbywenman/Connect/issues). Each milestone has an epic issue with a checklist of its tickets. Work tickets roughly in ID order: the "Depends on" column shows what must land first.

Labels: `M0`..`M3` (milestone), `area:*` (feature area), `type:ticket` / `type:epic` / `type:bug`.

Sizes: XS < 1 day · S 1-2 days · M 3-5 days · L 1-2 weeks (rough, human-pace estimates from the original backlog).

## M0 · Foundation ([epic #1](https://github.com/bobbywenman/Connect/issues/1))

Project scaffold, CI, design system, navigation shell, database schema and data layer. Nothing user-facing yet, but every later ticket builds on it.

| ID    | Ticket                                         | Area       | Size | Depends on   | Issue                                                   |
| ----- | ---------------------------------------------- | ---------- | ---- | ------------ | ------------------------------------------------------- |
| KT-01 | Scaffold the Expo app                          | foundation | S    | -            | [#5](https://github.com/bobbywenman/Connect/issues/5)   |
| KT-02 | CI pipeline on GitHub Actions                  | foundation | XS   | KT-01        | [#6](https://github.com/bobbywenman/Connect/issues/6)   |
| KT-03 | Design system and core components              | foundation | M    | KT-01        | [#7](https://github.com/bobbywenman/Connect/issues/7)   |
| KT-04 | Navigation shell                               | foundation | S    | KT-01        | [#8](https://github.com/bobbywenman/Connect/issues/8)   |
| KT-05 | Database schema v1, security rules and storage | backend    | M    | KT-01        | [#9](https://github.com/bobbywenman/Connect/issues/9)   |
| KT-06 | App data layer                                 | foundation | S    | KT-04, KT-05 | [#10](https://github.com/bobbywenman/Connect/issues/10) |

## M1 · Core Loop ([epic #2](https://github.com/bobbywenman/Connect/issues/2))

A user can sign up, create networks, add people, connect them, and study them with flashcards. First usable end-to-end version.

| ID    | Ticket                                     | Area          | Size | Depends on                 | Issue                                                   |
| ----- | ------------------------------------------ | ------------- | ---- | -------------------------- | ------------------------------------------------------- |
| KT-07 | Email sign up, log in and sign out         | auth          | S    | KT-03, KT-06               | [#11](https://github.com/bobbywenman/Connect/issues/11) |
| KT-08 | Forgot password and reset                  | auth          | XS   | KT-07                      | [#12](https://github.com/bobbywenman/Connect/issues/12) |
| KT-09 | Google sign-in                             | auth          | S    | KT-07                      | [#13](https://github.com/bobbywenman/Connect/issues/13) |
| KT-10 | Sign in with Apple                         | auth          | S    | KT-07                      | [#14](https://github.com/bobbywenman/Connect/issues/14) |
| KT-11 | 'Me' profile                               | people        | S    | KT-05, KT-07               | [#15](https://github.com/bobbywenman/Connect/issues/15) |
| KT-12 | Home screen: network list                  | networks      | M    | KT-06, KT-03               | [#16](https://github.com/bobbywenman/Connect/issues/16) |
| KT-13 | Create, edit and delete networks           | networks      | S    | KT-12                      | [#17](https://github.com/bobbywenman/Connect/issues/17) |
| KT-14 | Add and edit person form                   | people        | M    | KT-12                      | [#18](https://github.com/bobbywenman/Connect/issues/18) |
| KT-15 | Profile photos                             | people        | S    | KT-14                      | [#19](https://github.com/bobbywenman/Connect/issues/19) |
| KT-16 | People list per network                    | people        | M    | KT-14                      | [#20](https://github.com/bobbywenman/Connect/issues/20) |
| KT-17 | Person detail screen                       | people        | M    | KT-16                      | [#21](https://github.com/bobbywenman/Connect/issues/21) |
| KT-18 | Archive, delete and network membership     | people        | XS   | KT-17                      | [#22](https://github.com/bobbywenman/Connect/issues/22) |
| KT-19 | Relationship types and inverse rules       | relationships | S    | KT-05                      | [#23](https://github.com/bobbywenman/Connect/issues/23) |
| KT-20 | Add relationship flow                      | relationships | M    | KT-17, KT-19               | [#24](https://github.com/bobbywenman/Connect/issues/24) |
| KT-21 | Relationship badges, edit and remove       | relationships | S    | KT-20                      | [#25](https://github.com/bobbywenman/Connect/issues/25) |
| KT-22 | Study deck builder                         | study         | M    | KT-16, KT-20               | [#26](https://github.com/bobbywenman/Connect/issues/26) |
| KT-23 | Flashcards with flip and confidence rating | study         | M    | KT-22                      | [#29](https://github.com/bobbywenman/Connect/issues/29) |
| KT-24 | Session complete screen                    | study         | S    | KT-23                      | [#27](https://github.com/bobbywenman/Connect/issues/27) |
| KT-25 | Onboarding flow                            | onboarding    | L    | KT-13, KT-14, KT-20, KT-22 | [#28](https://github.com/bobbywenman/Connect/issues/28) |

## M2 · Full MVP ([epic #3](https://github.com/bobbywenman/Connect/issues/3))

Everything else in the P0 scope: search, events, contact import, duplicates and merge, graph view, reminders, study history.

| ID    | Ticket                               | Area          | Size | Depends on   | Issue                                                   |
| ----- | ------------------------------------ | ------------- | ---- | ------------ | ------------------------------------------------------- |
| KT-26 | Study history                        | study         | S    | KT-24        | [#30](https://github.com/bobbywenman/Connect/issues/30) |
| KT-27 | Global search                        | search        | M    | KT-16        | [#31](https://github.com/bobbywenman/Connect/issues/31) |
| KT-28 | 'New this month' smart list          | people        | S    | KT-16        | [#32](https://github.com/bobbywenman/Connect/issues/32) |
| KT-29 | Events: create, list and detail      | events        | S    | KT-16        | [#33](https://github.com/bobbywenman/Connect/issues/33) |
| KT-30 | Event attendees and event study deck | events        | S    | KT-29, KT-22 | [#34](https://github.com/bobbywenman/Connect/issues/34) |
| KT-31 | Import from phone contacts           | import        | M    | KT-14        | [#35](https://github.com/bobbywenman/Connect/issues/35) |
| KT-32 | Import LinkedIn connections from CSV | import        | M    | KT-31        | [#36](https://github.com/bobbywenman/Connect/issues/36) |
| KT-33 | Duplicate detection                  | people        | M    | KT-14        | [#37](https://github.com/bobbywenman/Connect/issues/37) |
| KT-34 | Merge profiles                       | people        | M    | KT-33        | [#38](https://github.com/bobbywenman/Connect/issues/38) |
| KT-35 | Graph view                           | views         | L    | KT-21        | [#39](https://github.com/bobbywenman/Connect/issues/39) |
| KT-36 | Birthday and anniversary reminders   | notifications | M    | KT-17        | [#40](https://github.com/bobbywenman/Connect/issues/40) |
| KT-37 | Notification settings                | notifications | S    | KT-36        | [#41](https://github.com/bobbywenman/Connect/issues/41) |

## M3 · Polish & Launch ([epic #4](https://github.com/bobbywenman/Connect/issues/4))

Org chart, map view, quality passes (accessibility, errors, performance), and App Store readiness.

| ID    | Ticket                                             | Area     | Size | Depends on          | Issue                                                   |
| ----- | -------------------------------------------------- | -------- | ---- | ------------------- | ------------------------------------------------------- |
| KT-38 | Org chart for Work networks                        | views    | L    | KT-35               | [#42](https://github.com/bobbywenman/Connect/issues/42) |
| KT-39 | Map view                                           | views    | L    | KT-17               | [#43](https://github.com/bobbywenman/Connect/issues/43) |
| KT-40 | Empty states and error handling pass               | quality  | M    | KT-25               | [#44](https://github.com/bobbywenman/Connect/issues/44) |
| KT-41 | Accessibility pass                                 | quality  | M    | KT-25               | [#45](https://github.com/bobbywenman/Connect/issues/45) |
| KT-42 | Performance pass                                   | quality  | M    | KT-27, KT-35        | [#46](https://github.com/bobbywenman/Connect/issues/46) |
| KT-43 | Account deletion and data export                   | settings | S    | KT-07               | [#47](https://github.com/bobbywenman/Connect/issues/47) |
| KT-44 | Release setup: EAS builds and App Store submission | release  | M    | KT-40, KT-41, KT-43 | [#48](https://github.com/bobbywenman/Connect/issues/48) |

## Not planned for MVP

| Item                                                                                                                                                                    | Why                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Facebook login and contact import                                                                                                                                       | Facebook does not share friend lists with apps (D-3)                       |
| LinkedIn login and API import                                                                                                                                           | API limited to approved partners; CSV import instead (D-3)                 |
| Android-specific polish                                                                                                                                                 | iOS first; Android should work through Expo but is not tested every ticket |
| Shared/collaborative networks, offline mode, relationship path finder, AI memory cards, gamification, PDF export, life timelines, favorites, family quick-add templates | PRD section 12 "Future ideas"                                              |

## Changing the plan

New work gets a new issue with the next free `KT-` number. When scope changes, update the issue, this file, and `docs/decisions.md` if a decision changed.
