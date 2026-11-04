# Changelog

## 2026-11-03 (web portal shell)

- Tokens: added the web-only portal shell colors from `web/index.html` to `tokens/colors.ts` (`ink3`, `inkDeep`, `inkEdge`, `inkLine`, `inkLine2`, `onInk2`, `onInk3`, `roleBlue`, `roleAmber`, `paper2`, `line2`, `tag`, `blue2`, `verified`, `verifiedTint`, `rejected`, `rejectedTint`, `scrim`). Additive keys; mobile maps only the keys it uses.
- README: added "Web portal" to the intentional production exceptions: A1 replaced by the club list; no applications, documents, activity feed, permissions or search; email-only invite modal; "Suspended" renamed "Deactivated"; `/trainer/invitations` built without an artboard; fixed artboard widths replaced by a 1024 px minimum layout.

## 2026-11-03 (admin club and trainer management)

- Clubs & trainers: added the "Inactive club" chip (status chip, `pending` tone) for memberships of a deactivated club; Leave stays available for an `ACTIVE` membership (ADR-017, D10).
- Onboarding: added the trainer-account message "This is a trainer account. Use the web portal to work with your club." and the generic non-athlete message, shown when `athlete.bootstrap` returns `FORBIDDEN` (ADR-017, D10).

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
