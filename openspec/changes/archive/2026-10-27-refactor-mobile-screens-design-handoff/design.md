# Design

## Context

See proposal.md for the motivation. These parts of the current state shape the approach:

- `apps/mobile` uses Expo SDK 55 with expo-router. Routes are `app/(auth)/{login,verify,callback}` and `app/(app)/{_layout,onboarding,profile-edit,achievements}`, plus `app/(app)/(tabs)/{profile,connections,search}`. `(app)/_layout.tsx` gates on session and onboarding, then renders a `Stack` that holds `(tabs)`.
- Styling is NativeWind 4. `tailwind.config.js` already has most handoff colors and radii, and `lib/theme.ts` has a partial color map. `lib/icons.tsx` is a text-glyph stand-in for Feather.
- `@packages/api-client` already exports typed hooks for every procedure these screens need (club, metric, visibility, certification, connection). No hook or router changes are needed.
- `connection.listConnections` returns accepted connections only, as bare IDs and unpaginated. The user chose to defer that API work (proposal).
- `club.listMyMemberships` and `metric.listEntries` are cursor-paginated (default 20, max 50). `metric.getSummaries` returns a bounded array. Entries carry `clubId` and `reportedByClubTrainerId` but no names.
- `athleteAchievement.verificationStatus` already includes `UNVERIFIED | PENDING | VERIFIED | REJECTED`. The server is the source of truth for the chip.
- The handoff (`docs/design-handoff/`) is a web prototype plus `StyleSheet.create` route stubs. Its paths (`app/(tabs)/…`, `@/tokens`) are illustrative, and the handoff itself lists the route-naming gap as out of scope.

## Goals / Non-Goals

**Goals:**
- Match the handoff visually, with tokens kept in one place that NativeWind classes and the occasional native-only style props (shadows, gradients, SVG fills) both read from.
- Keep each screen a thin composition of shared components and existing api-client hooks. Put pure decisions (state selection, chip mapping, audience labels, metric formatting, range filtering) in testable functions.
- Keep the existing route URLs (`/profile`, `/login`, `/verify`, `/achievements`, `/profile-edit`, `/search`) so deep links and redirects keep working.

**Non-Goals:**
- Adopting the handoff's `@/tokens` path alias or `app/(tabs)` layout literally.
- Localization infrastructure. The handoff's English copy is used as given, and i18n is a separate change.
- Offline caching beyond TanStack Query's default in-memory cache.

## Decisions

### D1. Tokens live in `apps/mobile/lib/theme.ts`, mirrored into `tailwind.config.js`
Port `docs/design-handoff/tokens/{colors,typography,spacing}.ts` into `lib/theme.ts` as `colors`, `text`, `space`, `radius`, and `shadow` (`as const`). `tailwind.config.js` `require`s the color and radius maps from a plain JS module (`lib/tokens.js`) that `theme.ts` re-exports with types, so the values are defined once. Typography presets become Tailwind `fontSize` entries with line height, for example `text-row-title`. Shadows stay as `Platform.select` style objects in `theme.ts`, because NativeWind shadow classes do not map cleanly to Android `elevation`.
- *Alternative:* keep two hand-synced copies. Rejected because they drift. The current config already lacks `danger*`, `dash`, and `segmented`.
- *Alternative:* `StyleSheet.create` as the handoff says. Rejected by the user in favour of AGENTS.md and ADR-011.

### D2. Real dependencies replace stand-ins
Use `npx expo install @expo/vector-icons react-native-svg expo-linear-gradient` so versions match SDK 55 (the user approved this). `lib/icons.tsx` keeps its `Feather` export and `IconName` union, but renders `@expo/vector-icons/Feather`. Callers stay unchanged, and the union grows to cover `activity`, `flag`, `alert-circle`, `refresh-cw`, `wifi-off`, `x`, `log-out`, `eye`, and `chevron-right`. The SVG chart is a hand-built `SpeedChart` (polyline + area path + grid), so no chart library is needed.

### D3. Route structure
- `app/(app)/(tabs)/_layout.tsx` registers `profile`, `connections`, `performance`, `clubs` in that order, with `initialRouteName="profile"`. The tab bar uses a custom `TabIcon` with `accessibilityRole="tab"` and `accessibilityState.selected`, and drops the lock decorator.
- `search.tsx` moves from `(tabs)/` to `(app)/search.tsx` and is registered in the `(app)` Stack. Its URL stays `/search`, so only the tab entry disappears.
- New `(app)/visibility.tsx` is a stack screen (`/visibility`), pushed from Profile, Performance, and Clubs.
- Certification UI lives in the existing `(app)/achievements.tsx`, with a per-achievement action sheet rather than a new route. This keeps the add-achievement flow and the status list in one place.
- *Alternative:* a nested Clubs stack for invitation detail. Rejected because an invitation only needs club name and two actions, so an inline row is enough.

### D4. One state-selection helper drives every tab
`@packages/shared-logic` gains `selectViewState({ isLoading, isError, isEmpty })`, which returns `'loading' | 'error' | 'empty' | 'loaded'` in the specified order, plus the `TAB_STATES` copy as a typed constant. Screens switch on the result and render `<StatePanel>`, `<EmptyRow>`, or their loaded body. Placing it in shared-logic (stdlib only) gives Vitest coverage, which `apps/mobile` lacks today.

### D5. Pure presentation helpers in `@packages/shared-logic`
- `achievementChip(status)` returns the label, tone, and icon for the four statuses. The server value is used as is, with no client derivation.
- `AUDIENCE_OPTIONS` and `AUDIENCE_DEFAULTS` hold `{ achievements: 'PUBLIC', clubMemberships: 'PRIVATE', metrics: 'PRIVATE' }`, with literals mirroring `visibilityAudienceEnum`. They follow the same compile-time equality pattern as `CLUB_MEMBERSHIP_STATUSES`.
- `filterEntriesByRange(entries, range, now)` and `formatMetricValue(value, unit)` live here too.
- `partitionMemberships(list)` returns `{ invitations, active, history }`. It drops `REJECTED` and sorts history newest first.

### D6. Data wiring per tab
Every tab gets the signed-in athlete's ID from `useMyAthlete()` (`data.athleteId`). Queries that need it pass it as `enabled: !!athleteId`, so nothing fetches with an empty ID. While the ID is loading, the tab is in the loading state. If the ID query fails, the tab shows its error state. Existing hook signatures are used as they are: `useConnections(athleteId: string)`, `useMetricSummaries(athleteId: string)`, and `useMetricEntries({ athleteId, ... })`. `useMyClubMemberships` derives the athlete server-side and takes no ID.

Loaded subtitles are built from live data using the handoff format (for example, "`N` athletes", "`A` active clubs · `I` invitations", "<sport> · <position>"). Only empty and error copy is taken verbatim from `TAB_STATES`.

- **Profile:** keeps its current queries (`useMyAthlete`, `useMyPublicProfile`, `getProfile`, `listAchievements` take 3, `useConnections(athleteId)`). It is restyled with the shared components and gains a "Visibility" entry in the header or completeness area. The completeness items are profile photo, bio, sport, and at least one achievement. "Documentos" is removed because the medical and document domain no longer exists (ADR-013), and the labels move to English.
- **Connections:** `useConnections(athleteId)` gives only a count. The loaded state shows the subtitle "`N` athletes", a network-count card, and a "Find athletes" action. Empty and error states use `TAB_STATES.connections`. Sample `NETWORK` data is deleted.
- **Performance:** `useMetricSummaries(athleteId)` gives the KPI cards, and `useMetricDefinitions` (take 50) provides names, units, and direction. Entries for the selected metric come from `trpc.metric.listEntries.useInfiniteQuery({ athleteId, metricDefinitionId, take: 50 })`, using the same pattern as `achievements.tsx`. The single-page `useMetricEntries` hook is not enough here. See D10 for when to fetch more. Each entry is labelled "Reported by a trainer at <Club>", with the club name resolved from `entry.clubId` against `useMyClubMemberships` (already cached for the Clubs badge), and "a club trainer" when the club is unknown. `reportedByClubTrainerId` is never displayed. The loaded subtitle is built from the public profile sport and position, falling back to "Trainer-reported metrics".
- **Clubs:** `useMyClubMemberships({ take: 50 })` is partitioned by D5. Accept and decline call `useRespondToClubInvitation`. Leave calls `useLeaveClub`. On success each one invalidates `club.listMyMemberships`, plus `achievement.listMyCertificationRequests` and `achievement.listAchievements` after a leave.
- **Badges:** the tabs layout reads the same `useMyClubMemberships` query, so React Query dedupes it. The badge appears only when the query `isSuccess` and the pending count is above zero.

### D7. Mutations are confirm-then-reflect, not optimistic
Membership responses, leave, certification request, and withdraw all wait for the server and then invalidate. Visibility updates are the one exception: they show the new selection right away and roll back `onError`, because the control is a segmented toggle where delay feels broken. The spec requires the saved value to match the server, which `onSettled` invalidation ensures.

### D8. Error copy
Server `TRPCError` messages are already user-facing, but screens never print them raw in state panels. They use the handoff copy, and mutation failures use a short toast or inline message mapped by tRPC error code (`FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, fallback). The current Spanish strings in touched screens (`login.tsx`, `profile.tsx` ErrorBoundary, `(app)/_layout.tsx`) are replaced with handoff English. The debug `ErrorBoundary` in `profile.tsx` that prints stack traces is removed.

### D9. Sign-in
`login.tsx` keeps `sendLoginMagicLink` and the `/verify` OTP flow and is visually rebuilt to the handoff (gradient background, brand tile, value props, Create account/Sign in copy toggle). It shows only the email button, and the Apple and Google buttons are omitted. `verify.tsx` and `callback.tsx` only adopt the tokens.

### D10. Entry paging follows the selected range
The server returns entries newest first (`measuredAt desc, id desc`). After each page, an effect calls `fetchNextPage()` only when `hasNextPage` is true and the oldest loaded `measuredAt` is still on or after the range start. Short ranges usually stop after one page. The all-time range has no start date, so it stops after 4 pages (200 entries) and the chart shows "Showing the latest 200 entries". The stop condition lives in a pure helper, `needsMoreEntries(oldestMeasuredAt, rangeStart, loadedCount, cap)`, in `@packages/shared-logic` so it can be unit-tested. Changing the metric or range resets the query key.
- *Alternative:* first page only. Rejected because long ranges would silently lose older points.
- *Alternative:* a new server-side `from` date filter. Rejected for this change because it would add API scope.

### D11. Intentional handoff exceptions
These are deliberate departures from the handoff, recorded in proposal.md and in the handoff README (task 8.1): trainer surfaces stay prototype-only; sign-in is email only, with no Apple or Google buttons; benchmarks and "Trainers at your clubs" are deferred; Connections is UI-only; and metrics are attributed to the club, not the trainer. The prototype's trainer metric-entry line "Reported by Jordan Lee · Stanford Athletics" changes to "Reported by a trainer at Stanford Athletics" so the design matches what production can show.

## Risks / Trade-offs

- [Invitation badge undercounts beyond 50 memberships] → Pending invitations are a small subset in practice. The first page is fetched with `take: 50`, and the remaining pages load on scroll in the Clubs tab. This is noted in code.
- [Connections tab looks sparse until the API follow-up lands] → It uses the handoff empty and loaded styles honestly rather than fake data. A follow-up change is recommended (`extend-connection-listing`).
- [Benchmarks and "Trainers at your clubs" from the prototype are omitted] → No athlete-facing API exists. They are listed in the proposal's out-of-scope section, and the handoff README gap notes are updated.
- [Metric entries show the club, not the trainer name] → The output exposes only `reportedByClubTrainerId`. Showing "Reported by a trainer at <Club>" satisfies attribution without a new API, and the prototype copy is aligned (D11).
- [All-time chart truncated at 200 entries] → The cap is stated on screen. If athletes regularly exceed it, a server-side date filter can follow.
- [`expo install` may bump transitive packages] → Run it from `apps/mobile` and review the lockfile diff before committing.
- [Tailwind config `require`ing a TS-adjacent JS module] → Keep `lib/tokens.js` as plain CommonJS with a `.d.ts`, so Metro, Babel, and the Tailwind CLI all load it.
- [No mobile test runner] → Logic is pushed into `@packages/shared-logic` (Vitest). Screens are verified with `turbo typecheck`/`lint` and a manual run on a simulator against seed data.

## Migration Plan

This is a client-only release, with no server or data migration. Search keeps its `/search` URL, so links and redirects still resolve. Rollback means reverting the mobile commit.
