# Tasks

## 1. Dependencies and tokens

- [x] 1.1 From `apps/mobile`, run `npx expo install @expo/vector-icons react-native-svg expo-linear-gradient`. Verify all three appear in `apps/mobile/package.json` at SDK 55 versions and that the lockfile diff has no unrelated major bumps.
- [x] 1.2 Create `apps/mobile/lib/tokens.js` (CommonJS, plus `tokens.d.ts`) with every color and radius from `docs/design-handoff/tokens/`. Have `tailwind.config.js` `require` it, and add the typography presets as `fontSize` entries. Verify that `bg-danger-tint`, `border-dash`, `bg-segmented`, and `text-row-title` compile, using a throwaway usage plus `turbo typecheck --filter=@app/mobile`.
- [x] 1.3 Rewrite `apps/mobile/lib/theme.ts` to re-export the token maps with types and add `shadow.{sm,cta,ctaLg,ink}` via `Platform.select`. Verify that existing imports of `colors` still typecheck.
- [x] 1.4 Change `apps/mobile/lib/icons.tsx` to render `@expo/vector-icons/Feather` while keeping the `Feather`/`IconName` API, and extend `IconName` with the icons from design D2. Verify that `turbo typecheck --filter=@app/mobile` passes and icons render on a simulator.

## 2. Shared presentation logic (`@packages/shared-logic`)

- [x] 2.1 Add `selectViewState` and the typed `TAB_STATES` empty and error copy (verbatim from `docs/design-handoff/design/states.jsx`). Add loaded-subtitle formatters that take live values (`connectionsSubtitle(count)`, `clubsSubtitle(active, invitations)`, `performanceSubtitle(sport, position)`), not the sample strings. Include Vitest tests for the loading > error > empty > loaded precedence and for each formatter. Verify that `turbo test --filter=@packages/shared-logic` passes.
- [x] 2.2 Add `achievementChip(status)` for UNVERIFIED, PENDING, VERIFIED, and REJECTED (label, tone, icon, accessible label), with tests for every status. Verify that the tests pass.
- [x] 2.3 Add `AUDIENCE_OPTIONS` and `AUDIENCE_DEFAULTS`, plus a compile-time equality assertion in `apps/api` against `visibilityAudienceEnum` (mirroring the `CLUB_MEMBERSHIP_STATUSES` pattern), and test the defaults. Verify that `turbo typecheck && turbo test` pass.
- [x] 2.4 Add `partitionMemberships` (drops REJECTED, splits invitations/active/history, history newest first), `filterEntriesByRange`, `needsMoreEntries(oldestMeasuredAt, rangeStart, loadedCount, cap)` (design D10), and `formatMetricValue`. Unit tests must cover empty input, boundary dates, the 200-entry cap, a range already covered by the first page, and null best values. Verify that the tests pass.
- [x] 2.5 Export the new functions from `packages/shared-logic/src/index.ts` and document them in the package README. Verify that `turbo lint --filter=@packages/shared-logic` passes.

## 3. Shared mobile components (`apps/mobile/components/`)

- [x] 3.1 Build `ScreenHeader` (gradient, brand row, bell button, title, subtitle, safe area), `ApMark`, `Card`, and `SectionTitle` with NativeWind classes and `theme.shadow.sm`. Verify that they render on a scratch route and match the prototype header.
- [x] 3.2 Build `Avatar`, `BlueCheck`, `Tag`, and the four status chips driven by `achievementChip`, each chip with an `accessibilityLabel`. Verify typecheck and a visual check.
- [x] 3.3 Build `StatePanel` (default/blue/danger tones, primary/secondary actions, `accessibilityLiveRegion="polite"`), `EmptyRow`, `OfflineBanner`, and per-tab skeletons. All touch targets must be at least 44pt. Verify that each tone renders.
- [x] 3.4 Build `AchievementRow`, `MSegmented`, `SpeedChart` (react-native-svg polyline, area, and grid, with an empty-series guard), and `AuthButton` (email variant only). Verify that `SpeedChart` renders 0, 1, and many points without throwing.
- [x] 3.5 Add `apps/mobile/components/README.md` listing each component and its token usage. Verify that it covers every component in 3.1–3.4.

## 4. Navigation shell

- [x] 4.1 Move `app/(app)/(tabs)/search.tsx` to `app/(app)/search.tsx`, register it in the `(app)` Stack with a back button, and restyle its header with `ScreenHeader`. Verify that `/search` opens above the tabs and back returns to the previous tab.
- [x] 4.2 Rewrite `app/(app)/(tabs)/_layout.tsx` with Profile, Connections, Performance, and Clubs (Feather `user`, `users`, `activity`, `flag`), tab accessibility roles and state, the active label weight at 700, and the lock decorator removed. Verify on a simulator that the order is correct and Profile is the initial tab.
- [x] 4.3 Add the Clubs badge from `useMyClubMemberships({ take: 50 })` (no athlete ID needed), shown only on success and when the pending count is above zero. The Connections tab has no badge. Verify with seed data that 0 and N pending invitations show no badge and N, respectively, and that a forced error shows no badge.
- [x] 4.4 Replace the Spanish strings and the debug `ErrorBoundary` in `(app)/_layout.tsx` and `(tabs)/profile.tsx` with handoff-style copy and `StatePanel`. Verify that no stack trace is rendered when a test throw is forced.

## 5. Tab screens

- [x] 5.1 Restyle Profile with the identity card, About, Achievements (3 rows with chips, "See all" to `/achievements`), the completeness card, and a Visibility entry to `/visibility`. In the completeness card, remove the "Documentos" item (a medical-domain remnant, ADR-013) and use English labels for photo, bio, sport, and achievements. Get `athleteId` from `useMyAthlete()` and pass it to `useConnections(athleteId)` and the other queries with `enabled: !!athleteId`. Wire loading/error/empty through `selectViewState` and make the error panel's "Sign out" call `useSignOut`. Verify each state against seed data and a forced network failure, and that `grep -n "Documentos" apps/mobile` returns nothing.
- [x] 5.2 Rewrite Connections without the `NETWORK` sample data: show the real count from `useConnections(athleteId)` (ID from `useMyAthlete()`), a loaded subtitle from `connectionsSubtitle`, a "Find athletes" action to `/search`, and the handoff empty and error states. Verify that no hard-coded names remain (`grep -n "Sofia Martinez" apps/mobile` returns nothing) and that 0 and N connections render correctly.
- [x] 5.3 Create `(tabs)/performance.tsx` with `athleteId` from `useMyAthlete()`:
  - a KPI grid from `useMetricSummaries(athleteId)` plus definitions, and a metric picker;
  - `SpeedChart` and recent-entry rows from `trpc.metric.listEntries.useInfiniteQuery({ athleteId, metricDefinitionId, take: 50 })`, fetching more pages per `needsMoreEntries` and showing the 200-entry cap note on the all-time range;
  - entry rows labelled "Reported by a trainer at <Club>", with no trainer name or ID;
  - an `MSegmented` range control;
  - no add, edit, or delete controls;
  - empty-state actions that open `/clubs` and `/visibility`.

  Verify against a seeded athlete with entries and one without, and against a seeded metric with more than 50 entries in range, which must trigger a second page.
- [x] 5.4 Create `(tabs)/clubs.tsx` with a loaded subtitle from `clubsSubtitle`: invitations with Accept and Decline (decline confirms) via `useRespondToClubInvitation`, active and history lists via `partitionMemberships`, and Leave with a confirmation that mentions cancelled certification requests. Mutations invalidate per design D6. Verify accept, decline, and leave against seed data, and that a failed response keeps the invitation listed.

## 6. ADR workflow screens

- [x] 6.1 Create `(app)/visibility.tsx` with three `MSegmented` controls (Private/Connections/Public), default labels from `AUDIENCE_DEFAULTS`, and single-field `useUpdateVisibilitySettings` calls with optimistic select and rollback `onError`. Register it in the `(app)` Stack. Verify that a fresh athlete shows Public/Private/Private and that a forced failure reverts the control.
- [x] 6.2 Extend `(app)/achievements.tsx` with an action sheet per achievement. Request certification picks from ACTIVE memberships, and is disabled with an explanation when there are none. Withdraw is available on Pending. Rejected shows the club and reason from `useMyCertificationRequests` and offers Request again. Verified shows no action. Verify the full cycle against seed data: request, Pending, withdraw, Unverified, request again.
- [x] 6.3 Map certification mutation errors (`BAD_REQUEST`/`FORBIDDEN`/`NOT_FOUND`) to user-facing messages, keep the prior status, and invalidate `listAchievements` and `listMyCertificationRequests`. Verify by requesting against a club the athlete just left.

## 7. Sign-in

- [x] 7.1 Rebuild `(auth)/login.tsx` to the handoff layout (gradient, field lines, brand tile, value props, Create account/Sign in toggle, terms microcopy) with only the email `AuthButton` and the existing `sendLoginMagicLink` → `/verify` flow. Failure shows "Couldn't sign you in. Try again." Verify that a Magic Link is sent on a simulator and that no Apple or Google control exists.
- [x] 7.2 Apply tokens and shared components to `(auth)/verify.tsx` and `(auth)/callback.tsx` without changing their behavior. Verify that OTP sign-in still completes.

## 8. Docs and integration

- [x] 8.1 Update `docs/design-handoff/README.md`:
  - mark the tab shell and route naming as reconciled;
  - add an "Intentional production exceptions" section listing trainer surfaces as prototype-only, email-only sign-in (no Apple or Google), deferred benchmarks and "Trainers at your clubs", UI-only Connections pending a connection API, club-only metric attribution, NativeWind instead of `StyleSheet.create`, and live loaded subtitles instead of sample counts.

  Change the metric-entry line in `docs/design-handoff/design/adr-flows.jsx` from "Reported by Jordan Lee · Stanford Athletics" to "Reported by a trainer at Stanford Athletics", and add a CHANGELOG entry. Verify that the README no longer claims Performance and Clubs routes are missing, that every exception above is listed, and that `grep -n "Jordan Lee" docs/design-handoff` returns nothing.
- [x] 8.2 Run `turbo typecheck && turbo test && turbo lint` from the repo root, and fix any failures. Verify that all three exit 0.
- [x] 8.3 Do a manual simulator pass against `prisma/seed.ts` data covering every spec scenario in `specs/mobile-*`, and record any deviations in the change. Verify that every scenario has been checked.

## 9. Device review follow-ups (2026-10-20)

- [x] 9.1 Make "Try again" show the loading state while the retry is in flight (no error → data blink). `selectViewState` gains `isFetching`, and `lib/query-state.ts` provides `isBusy`/`isFailed` for every screen. Verify that the shared-logic tests cover retry-after-error, and on a device that the skeleton shows between the error panel and the data.
- [x] 9.2 Add `@react-native-community/datetimepicker` (`npx expo install`, user-approved) and a shared `DateField` component that keeps the `YYYY-MM-DD` value contract. Use it for date of birth in `profile-edit.tsx` and the achievement date in the add form. Verify typecheck and lint, and on a device that both fields open a native picker and reject future dates.
- [x] 9.3 Add a shared keyboard-aware scroll wrapper (built-in APIs only) that keeps the focused input above the keyboard on iOS and on Android edge-to-edge. Apply it to login, verify, the achievement add form (as a bottom sheet), `profile-edit.tsx`, and `onboarding.tsx`. Verify on a device that focusing the lowest input on each screen keeps it visible while typing.
- [x] 9.4 Make the search screen honest until search is wired: keep the field, show a "Search is coming soon" note, and render no fake results. Record the follow-up change (`wire-athlete-search`: name-bearing `searchAthletes` results plus a Connect action) in the handoff README. Verify that typing shows no misleading results.
- [x] 9.5 Add a toast notification for every save (user request, 2026-10-20). Build a small provider and viewport in `apps/mobile/components/Toast.tsx` (React context and `useState`; no new dependency or global store), with success and error tones, auto-dismiss, screen-reader announcement, and a viewport inside modals so toasts show above sheets. Use it for: visibility update, club accept/decline/leave, certification request/withdraw, add achievement, and profile-edit save. Error toasts replace the current `Alert` error dialogs; confirmation dialogs stay. Verify typecheck and lint, and on a device that each save shows a success toast and a forced failure shows an error toast.
- [x] 9.6 Make the chart and paging checks verifiable (user request, 2026-10-27). Move SpeedChart's point math into `chartGeometry` in `@packages/shared-logic`, with Vitest tests for 0, 1, many, flat, and unsized cases. Add a dev-only `prisma/dev-fixtures/performance.ts` (`yarn db:fixture:performance [--athlete <slug>] [--replace]`). It gives a signed-up athlete an ACTIVE seeded-club membership and 1, 4, 70 (last 3 months), and 300 entries across four metrics, with summaries recomputed. Verify that `turbo test --filter=@packages/shared-logic` passes and the fixture typechecks under strict settings.
- [x] 9.7 Add dev fixtures for the remaining device checks (user request, 2026-10-27), sharing `--athlete <slug>` via `prisma/dev-fixtures/shared.ts`, in order: `db:fixture:clubs` (ACTIVE ×2, pending invitations ×2, COMPLETED, REJECTED), `db:fixture:performance`, `db:fixture:connections` (ACCEPTED ×3, PENDING ×2, DECLINED; counts updated), and `db:fixture:achievements` (UNVERIFIED, CANCELLED→UNVERIFIED, PENDING, VERIFIED, REJECTED with a reason). Each respects the membership, certification, and metric-entry triggers. Documented in `prisma/dev-fixtures/README.md`. Verify that all fixtures typecheck under strict settings.
