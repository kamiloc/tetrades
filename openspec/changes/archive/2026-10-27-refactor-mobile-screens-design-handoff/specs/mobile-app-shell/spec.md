# Spec Delta

## Purpose

Defines the signed-in athlete's mobile navigation shell, its shared data-state presentation, and the sign-in screen, following ADR-013–016 and the design handoff.

## ADDED Requirements

### Requirement: Four-tab athlete navigation
The signed-in mobile app SHALL present exactly four tabs in this order: Profile, Connections, Performance, Clubs. Profile SHALL be the initial tab. The app SHALL NOT present a Search tab.

#### Scenario: Signed-in athlete opens the app
- **WHEN** an authenticated athlete with a completed onboarding opens the app
- **THEN** the tab bar shows Profile, Connections, Performance, Clubs in that order
- **AND** the Profile tab is selected

#### Scenario: No Search tab
- **WHEN** the athlete inspects the tab bar
- **THEN** no tab named Search is present

### Requirement: Athlete search is reachable from Connections
Athlete search SHALL remain available as a screen pushed from the Connections tab's "Find athletes" action, and SHALL return to Connections on back navigation.

#### Scenario: Opening search
- **WHEN** the athlete taps "Find athletes" on the Connections tab
- **THEN** the athlete search screen opens above the tab shell

#### Scenario: Leaving search
- **WHEN** the athlete navigates back from search
- **THEN** the Connections tab is shown

### Requirement: Every tab presents loading, error, empty, and loaded states
Each tab SHALL pick its state in this order: loading while its data is being fetched, error when the fetch fails, empty when it has no data, and loaded otherwise. The screen header SHALL stay visible in every state. Empty and error copy (subtitle, panel title, body, and action labels) SHALL match the handoff `TAB_STATES` verbatim. Loaded subtitles SHALL follow the handoff format but use live values, never the handoff's sample counts or names.

#### Scenario: Fetch in progress
- **WHEN** a tab's data has not loaded yet
- **THEN** the tab shows its skeleton under the header

#### Scenario: Fetch fails
- **WHEN** a tab's query returns an error
- **THEN** the tab shows its error panel with the handoff copy
- **AND** the error message from the server is not shown verbatim

#### Scenario: No data
- **WHEN** a tab's query succeeds with no data
- **THEN** the tab shows its empty panel with the handoff copy and actions

#### Scenario: Loaded subtitle uses live values
- **WHEN** the Clubs tab loads with 1 active club and 2 pending invitations
- **THEN** the subtitle reflects 1 active club and 2 invitations, not the handoff sample "2 active clubs · 1 invitation"

### Requirement: Profile completeness reflects the current domain only
The Profile completeness card SHALL count only items that exist in the product after ADR-013. It SHALL NOT include documents, medical records, or any OCR-related item.

#### Scenario: Completeness items
- **WHEN** the Profile tab shows the completeness card
- **THEN** no documents item is listed or counted toward the percentage

### Requirement: Retry re-fetches the failed data
The primary "Try again" action of any error panel SHALL re-fetch the data for that tab. The Profile error panel's secondary action SHALL sign the athlete out.

#### Scenario: Retry after an error
- **WHEN** the athlete taps "Try again" on an error panel
- **THEN** the tab re-requests its data and shows the loading state

#### Scenario: Sign out from profile error
- **WHEN** the athlete taps "Sign out" on the Profile error panel
- **THEN** the session ends and the sign-in screen is shown

### Requirement: Tab badges reflect actionable items only
The Clubs tab SHALL show a badge with the number of pending club invitations addressed to the athlete. A badge SHALL be hidden when its count is zero, while its data is loading, or while its tab is in an error state. The Connections tab SHALL NOT show a badge until a pending-request listing exists.

#### Scenario: Pending invitations
- **WHEN** the athlete has two memberships in `PENDING_ATHLETE_CONFIRMATION`
- **THEN** the Clubs tab shows a badge reading 2

#### Scenario: No pending invitations
- **WHEN** the athlete has no pending invitations
- **THEN** the Clubs tab shows no badge

#### Scenario: Clubs data failed
- **WHEN** the memberships query fails
- **THEN** the Clubs tab shows no badge

### Requirement: Connections screen shows only data the API provides
The Connections tab SHALL NOT show sample or invented athletes. It SHALL show the athlete's real accepted-connection count, and SHALL use the empty state when that count is zero.

#### Scenario: Athlete with connections
- **WHEN** the athlete has 5 accepted connections
- **THEN** the Connections header subtitle reflects 5 athletes
- **AND** no hard-coded athlete names are displayed

#### Scenario: Athlete with no connections
- **WHEN** the athlete has no accepted connections
- **THEN** the "No connections yet" empty panel is shown

### Requirement: Sign-in offers only Magic Link with OTP fallback
The sign-in screen SHALL follow the handoff's dark layout and copy, and SHALL offer email sign-in only: a Magic Link with OTP fallback. It SHALL NOT offer Apple, Google, or password sign-in.

#### Scenario: Athlete signs in with email
- **WHEN** the athlete enters an email and continues
- **THEN** a Magic Link is sent and the OTP verification screen is offered

#### Scenario: No third-party providers
- **WHEN** the sign-in screen is shown
- **THEN** no Apple or Google sign-in control is present

#### Scenario: Sign-in failure
- **WHEN** the sign-in request fails
- **THEN** an inline banner reads "Couldn't sign you in. Try again."
