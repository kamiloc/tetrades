# Proposal

## Why

ADR-013 to ADR-016 moved the product to clubs, trainer-reported metrics, per-category visibility, and club-trainer certification of achievements. The backend already supports all of this, but the mobile app still shows the earlier design. It has a Profile / Connections / Search tab bar, hard-coded sample connections, text glyphs instead of icons, and no screens for clubs, metrics, visibility, or certification. The design handoff (`docs/design-handoff/`, updated 2026-10-18) now specifies these screens, so the app can be brought in line with the ADRs.

## What Changes

- **BREAKING (navigation):** The tab bar becomes Profile, Connections, Performance, Clubs, in that order. The Search tab is removed, and search moves to a stack route opened from the Connections "Find athletes" action.
- The handoff tokens (colors, typography, spacing, radii, shadows) go into the NativeWind config and `apps/mobile/lib/theme.ts`, and the shared components from the handoff are built in `apps/mobile/components/` using NativeWind classes. The handoff's `StyleSheet.create` instruction is superseded by AGENTS.md and ADR-011.
- Three Expo-bundled packages become direct dependencies of `apps/mobile`: `@expo/vector-icons` (Feather icons replace the glyph fallback in `lib/icons.tsx`), `react-native-svg` (AP mark, verified check, speed chart), and `expo-linear-gradient` (header and blue panels). The user approved these in planning.
- Profile is restyled to the handoff: identity card, About, Achievements with four status chips (Unverified, Pending, Verified, Rejected), and a completeness card. The card drops the "Documentos" item, which is left over from the medical domain that ADR-013 removed.
- Connections is restyled to the handoff and its hard-coded sample athletes are removed. Today `connection.listConnections` returns only accepted connections as bare IDs, with no pending-request listing. The screen therefore shows the real connection count, the handoff empty and error states, and the "Find athletes" entry to search. The rich network list and the pending-requests card are deferred to a follow-up API change.
- New Performance tab: KPI cards from `metric.getSummaries`, a trend chart and recent-entry rows from `metric.listEntries` (paged newest-first until the selected range is covered), and a range segmented control. Every metric is labelled "Reported by a trainer at <Club>", and the athlete cannot enter metrics.
- New Clubs tab: club invitations with Accept and Decline (`club.respondToInvitation`), active club history, and Leave (`club.listMyMemberships`, `club.leave`).
- New visibility settings screen with separate audience controls (Private, Connections, Public) for achievements, club memberships, and metrics, each showing its default (`visibility.get` / `visibility.update`).
- Athlete-side certification: request certification from an active club, see Pending, withdraw, see a Rejected status with its reason, and request again (`achievement.requestCertification`, `withdrawCertification`, `listMyCertificationRequests`).
- Every tab shows loaded, empty, error, and loading states, using the handoff `TAB_STATES` copy verbatim. The Clubs tab badge shows the pending invitation count and is hidden at zero or outside the loaded state. The Connections badge stays hidden until a pending-request API exists.
- The sign-in screen is restyled to the handoff's dark layout but keeps Magic Link with OTP fallback. Apple and Google buttons are **not** added, because AGENTS.md allows only Magic Link and OTP.

### Intentional handoff exceptions

The handoff is matched except in these deliberate places, and each one is recorded in the handoff README:

- **Trainer surfaces** (certification inbox, metric entry) stay prototype-only, because the trainer portal platform is undecided.
- **Sign-in** is email only (Magic Link with OTP fallback). The handoff's Apple and Google buttons are not built.
- **Benchmarks and "Trainers at your clubs"** are deferred until athlete-facing APIs exist.
- **Connections** is restyled with live counts only. The network list and pending requests wait for a connection API change.
- **Metric attribution** names the club, not the trainer, because entries expose only a trainer ID. The prototype copy is updated to match.

Out of scope: trainer surfaces (certification inbox, metric entry, roster). The trainer procedures exist, but the trainer portal route is undecided. Also out of scope: connection API changes (counterpart identity, pagination, incoming requests), benchmark percentiles and the "Trainers at your clubs" list (no athlete-facing API exists), editing achievements, the public web profile, push notifications, and dark theme.

## Capabilities

### New Capabilities
- `mobile-app-shell`: tab order and navigation, search relocation, shared screen header, per-tab loaded/empty/error/loading states, tab badges, and the sign-in screen layout.
- `mobile-performance-view`: how the athlete's own trainer-reported metric summaries and entries are presented, read-only.
- `mobile-club-membership-view`: how the athlete reviews and responds to club invitations, sees club history, and leaves a club.
- `mobile-visibility-settings`: how the athlete reads and changes the three audience settings and sees their defaults.
- `mobile-achievement-certification-view`: how the athlete sees achievement status and requests, withdraws, and re-requests certification.

### Modified Capabilities
<!-- None: no server behavior changes. The mobile screens use existing procedures as they are. -->

## Impact

- **Code:** all of `apps/mobile/app/(app)/` (tabs layout, profile, connections, new performance and clubs tabs, search moved to a stack route, achievements, new visibility-settings route), `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/components/` (new shared components), and `apps/mobile/lib/` (theme, icons, data hooks). `tailwind.config.js` gets the remaining handoff tokens.
- **Shared packages:** the screens use the typed hooks `@packages/api-client` already exports (`useMyClubMemberships`, `useRespondToClubInvitation`, `useLeaveClub`, `useMetricSummaries`, `useMetricEntries`, `useMetricDefinitions`, `useMyVisibilitySettings`, `useUpdateVisibilitySettings`, `useRequestCertification`, `useWithdrawCertification`, `useMyCertificationRequests`, `useConnections`). Pure presentation helpers (state selection, audience labels, metric formatting) go in `@packages/shared-logic` with Vitest coverage. No validators, routers, Prisma schema, or RLS changes.
- **Dependencies:** `@expo/vector-icons`, `react-native-svg`, `expo-linear-gradient` (installed with `expo install` to match SDK 55).
- **Docs:** the handoff README's "Out of scope" notes about the tab shell and route naming will be resolved. `docs/design-handoff/` has uncommitted edits on this branch that need to be committed with this change or separately.
