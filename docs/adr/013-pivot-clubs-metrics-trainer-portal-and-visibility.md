# ADR-013: Pivot — Clubs, Sport Metrics, Trainer Portal, and Visibility Controls

- **Status:** Accepted
- **Date:** 2026-10-03
- **Supersedes:** [ADR-009](009-medical-ocr-state-machine-and-verification-flow.md)

## Context

The product no longer handles medical records or OCR. It now centers on club affiliation, trainer-reported sport metrics, and athlete-controlled visibility. This ADR constrains that pivot so generated code cannot drift from the intended trust boundaries. It fixes boundaries and invariants only; field-level design belongs to the openspec change that introduces each entity.

## Decision

### 1. Medical and OCR domain removed

- No medical, diagnosis, medication, doctor, clinic, or OCR concept may be added or retained in new work.
- `MedicalDocument`, `OcrJob`, the `medical` router, the `processOCR` job, their RLS policies, and their tests are removed through a dedicated change, not piecemeal.
- Identity PII (government ID, exact date of birth, contact email/phone) is unaffected. It stays L2-CONFIDENTIAL in `AthletePrivateProfile`.

### 2. New entities (names fixed, fields deferred)

`Club`, `ClubTrainer`, `ClubMembership`, `MetricDefinition`, `AthleteMetricEntry`, `AthleteMetricSummary`, `AthleteVisibilitySettings`. Built by openspec change `add-clubs-metrics-visibility-model`; fields and classifications are in `prisma/schema.prisma` and `docs/erm/{clubs,sport-metrics,visibility}.mmd`.

### 3. Classification vs. visibility

- Classification (L0–L3) is storage sensitivity. Visibility is audience control, owned by the athlete via `AthleteVisibilitySettings`. Neither substitutes for the other.
- Intended classification: `Club` / `ClubMembership` mostly L0 (membership state L1), `MetricDefinition` L0 (catalog), `AthleteMetricEntry` L1, `AthleteVisibilitySettings` L1. Per-field levels are assigned when the schema is written.

### 4. Trainer trust boundary

- A trainer is a user acting through `ClubTrainer` for a specific club. There is no cross-club authority.
- Trainers NEVER read or write `AthletePrivateProfile` or any L2 field. No trainer or club role, procedure, or policy may grant this, including through break-glass in the application layer.
- A trainer may read or write an athlete's data only through an `ACTIVE` `ClubMembership` between that athlete and the trainer's club, and only the metric data in scope.

### 5. Membership requires athlete consent

- A club (or trainer) can invite an athlete, but the association becomes effective only when the athlete confirms.
- `ClubMembership.status` has exactly four states:
  - `PENDING_ATHLETE_CONFIRMATION` — invited, not yet confirmed. Grants no read or write access.
  - `ACTIVE` — the athlete confirmed. The only state that grants trainer access.
  - `COMPLETED` — the athlete is no longer in the club. Terminal.
  - `REJECTED` — the athlete rejected the club's invitation. Terminal.
- Allowed transitions: `PENDING_ATHLETE_CONFIRMATION → ACTIVE`, `PENDING_ATHLETE_CONFIRMATION → REJECTED`, `ACTIVE → COMPLETED`. No other transitions; terminal states are never reopened (a new invitation creates a new membership).
- Only `ACTIVE` grants access. `PENDING_ATHLETE_CONFIRMATION`, `COMPLETED`, and `REJECTED` grant none, so trainer write access ends when a membership leaves `ACTIVE`.
- A `PENDING_ATHLETE_CONFIRMATION` or `REJECTED` membership must not appear on the athlete's public profile or in club rosters visible to others.

### 6. Trainer-reported metric entries

- "Trainer-reported" is the standard term for metric entries submitted by a trainer. Do not use "coach-submitted" or similar variants.
- Writes are accepted only when the trainer's club has an `ACTIVE` `ClubMembership` with the athlete at write time. A `COMPLETED` membership accepts no new entries.
- Every entry records the reporting trainer. Entries are attributable and never anonymous.
- `AthleteMetricSummary` is derived from entries. It is never written directly by a client.

### 7. Visibility enforcement

- Visibility is enforced in the service layer for every procedure returning athlete data, **list and detail alike**. Detail-only filtering is a defect (stranger-queries-the-unfiltered-list is the known failure mode).
- Where a table is directly readable under RLS, RLS also encodes the visibility rule; the application layer is not the only defense.
- Public SSR pages, search/directory, sitemap, and club rosters all apply visibility. A missing `AthleteVisibilitySettings` row resolves to the most restrictive setting.

## Required tests

- RLS deny-tests for `Club`, `ClubMembership`, and `AthleteMetricEntry` across tenants, using two distinct users per `AGENTS.md`.
- A test proving a trainer cannot write a metric entry for an athlete whose membership is `PENDING_ATHLETE_CONFIRMATION`, `COMPLETED`, or `REJECTED`.
- Tests proving each disallowed membership transition is rejected.
- A test proving a trainer from club A cannot read or write for an athlete whose membership is with club B.
- A test proving trainers cannot read `AthletePrivateProfile`.
- A test proving list and detail endpoints return consistent results under identical visibility settings.

## Consequences

- Removing medical data shrinks the L2 surface to identity PII.
- The trainer portal adds a new third-party actor; the access matrix and threat model must cover it.
- The schema, RLS policies, services, and routers exist (change `add-clubs-metrics-visibility-model`). The trainer portal and athlete UI screens are still separate work.

## Resolved items

- **Trainer role model (2026-10-03):** a trainer is derived solely from `ClubTrainer` rows. No new `UserRole` value is added.
- **Membership states (2026-10-03):** `COMPLETED` and `REJECTED` as defined in section 5.
- **Entries after `COMPLETED` (2026-10-05):** entries are append-only and retained. The club's trainers lose access; everyone else follows the athlete's visibility settings. A hide-on-completion rule, if wanted, can be added to the visibility service without changing the model.
- **Who ends a membership (2026-10-05):** only the athlete moves `ACTIVE → COMPLETED`. Club-initiated removal is out of scope until a later change.

## Open items

None.

Refactor design_handoff/ to match the latest prototype at the project root. Use the existing handoff as the base: keep its structure, tone, README format, stack constraints and token approach. Change only what the new design requires.

Source of truth (root): index.html, app.jsx, screens.jsx, screens-2.jsx, states.jsx, ios-frame.jsx, tweaks-panel.jsx. Ignore web/.

## 1. Navigation changes
- Tabs are now: Profile (user) · Connections (users, badge 3) · Performance (activity) · Clubs (flag, badge 2). See TABS in screens.jsx and HEADER_BY_TAB in app.jsx.
- Delete app/(tabs)/documents.tsx and search.tsx. Remove the lock-dot decorator.
- Add app/(tabs)/performance.tsx and clubs.tsx stubs in the same style as the existing stubs (detailed header comment: layout, exact copy, data, tokens).
- Update _layout.tsx with the new order, icons and badges. Badges come from useConnections().pendingCount and useClubs().requestCount. Omit a badge when its count is 0 or when the tab is in an empty or error state (TabBar hideBadges in screens.jsx).

## 2. New screens (screens-2.jsx)
- Performance: header "Performance" / "Season 2026 · Midfielder". Contains PF_KPI cards, SpeedChart (PF_SPEED × PF_MONTHS, react-native-svg, no chart lib), PF_BENCH percentile bars, PF_TESTS rows with verified/pending chips, and MSegmented.
- Clubs & trainers: header "Clubs & trainers" / "3 clubs · 2 trainer requests". Contains CL_REQ trainer requests with permission chips, the CL_HIST club timeline (current club flagged), and the CL_STAFF access list.
Write full README specs (§3 Performance, §4 Clubs & trainers) at the same detail level as Profile.

## 3. Empty + error states (states.jsx) — NEW
Every tab supports three data states: loaded | empty | error (the prototype's "Data state" tweak).
- Tokens (add to tokens/colors.ts): danger #C23B3B, dangerTint #FDECEC, dangerLine #F6D4D4, dash #CBD3DF.
- Shared components (add to "Components to build"):
  - StatePanel: hero card. tone blue|danger, 52×52 icon tile with radius 16, optional eyebrow, title 18/700, body 13.5 muted (max-width 280), primary / ghost "Try again" (refresh icon) / secondary text button, optional monospace error code. Blue tone uses the #F7FAFF→#FFF gradient with a blueLine border; danger tone uses a white background with a dangerLine border.
  - EmptyRow: inline empty row inside a section card. 34×34 dashed tile, icon, 13px muted text.
  - OfflineBanner: dangerTint banner with a wifi-off icon, message and a "Retry" link.
- Per-tab states (copy every string verbatim from states.jsx):
  - Profile: empty = dashed avatar, "—" stats, "Build your passport" panel, empty Achievements row. Error = "Couldn't load your profile" + Try again / Sign out.
  - Connections: empty = "No connections yet" + Find athletes / Invite teammates, empty Pending row. Error = offline banner + dimmed cached network + "Couldn't load requests" panel (partial failure).
  - Performance: empty = dashed "—" KPI grid + "No performance data yet" + Log a session / Invite a trainer. Error = "Couldn't load performance data".
  - Clubs: empty = "Add your club history" + empty Trainer requests and Staff rows. Error = "You're offline" (wifi-off icon).
  - Header subtitles change per state (TAB_STATES[tab].sub).
- Icons map to Feather: alert → alert-circle, refresh → refresh-cw, wifi-off → wifi-off.
- In each tab stub, branch on the hook result: isLoading → skeleton, error → <Tab>Error, empty data → <Tab>Empty, otherwise loaded. Add a README section "## Data states" that covers the rule, the components and a per-tab table (empty trigger, error type, CTAs and actions).

## 4. Bundle
- design/: replace it with the current root prototype files (including screens-2.jsx and states.jsx) and keep the script load order from index.html.
- tokens/: add every new value used in screens-2.jsx and states.jsx (chart line/grid/fill, percentile track, segmented bg #E9EDF3 radius 10, danger set, dash). Don't duplicate existing tokens.
- README:
  - Remove the Documents/Search specs, the Notify-me behavior and the stale "Auth gate (shared)" section.
  - Update the Tab order, File map, Files-in-bundle tree, Interactions, State hooks (add usePerformance(), useClubs(), each returning { data, isLoading, error, refetch }), Accessibility (error panels announce via accessibilityLiveRegion="polite"; Try again ≥44pt) and Definition of done (each tab renders all 3 states).
  - Out of scope: Documents and Search become future work, plus backend wiring for trainer accept/decline.
  - Add "## Changelog" at the top, dated 2026-10-07, summarizing the changes above.

Constraints: RN + Expo Router, TS strict, StyleSheet only, no new deps, Feather icons only. Take every value from source and don't invent anything. `tsc --noEmit` must pass. Finish by listing any prototype detail you couldn't map to a token or spec.