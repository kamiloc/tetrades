# Changelog

# 2026-10-28 (web portal audit)

- Added the admin and trainer web portal prototype inventory to the handoff README.
- Audited the prototype against ADR-013–016, the PII access matrix, and current API procedures in `WEB-AUDIT.md`.
- Recorded unsupported admin, trainer, document-review, evidence, invitation, search, export, and activity-feed capabilities as implementation gaps; clarified the trainer access and certification boundaries.

## 2026-10-18 (production alignment)

- Recorded the production implementation status and intentional production exceptions (trainer surfaces, email-only sign-in, deferred benchmarks and trainer list, UI-only Connections, club-only attribution, NativeWind, live loaded subtitles).
- Replaced trainer names in prototype metric rows, invitations, and the trainer list with club or role attribution, matching what production can show.
- Removed the stale notes saying the production tab shell lacked Performance and Clubs and that route naming was unreconciled.

## 2026-10-18

- Aligned club and performance screen copy and route scaffolds with ADR-013 membership consent and trainer-reported metrics.
- Added prototype previews for category-specific visibility, athlete certification, club invitations, trainer certification decisions, and trainer metric entry.
- Added achievement Unverified/Rejected states and documented prototype versus current app route gaps.

## 2026-10-07

- Updated the tab bar to Profile, Connections, Performance, and Clubs; removed Search and the lock-dot decorator.
- Added Performance and Clubs & trainers screen specifications and route stubs.
- Added loaded, empty, and error state guidance and shared state components for each tab.
- Refreshed tokens, interactions, accessibility notes, bundle map, and completion criteria.
