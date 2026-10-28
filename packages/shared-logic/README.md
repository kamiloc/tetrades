# @packages/shared-logic

Pure TypeScript shared by the API and the apps. Standard library only: no React, Zod, Prisma, or other packages (AGENTS.md package contracts). Literal unions that mirror a Zod enum are checked against it at compile time in `apps/api/src/__checks__/prisma-zod-bridge.ts`.

| Module | Exports | Used by |
| --- | --- | --- |
| `club-membership.ts` | `CLUB_MEMBERSHIP_STATUSES`, `CLUB_MEMBERSHIP_TRANSITIONS`, `OPEN_CLUB_MEMBERSHIP_STATUSES`, `canTransitionClubMembership`, `clubMembershipGrantsTrainerAccess` | API membership service (ADR-013) |
| `view-state.ts` | `selectViewState` (loading → error → empty → loaded), `TAB_STATES` (handoff empty and error copy, verbatim), `connectionsSubtitle`, `clubsSubtitle`, `performanceSubtitle` (loaded subtitles from live values) | Mobile tabs |
| `achievement-chip.ts` | `VERIFICATION_STATUSES`, `achievementChip` (label, tone, icon, accessible label), `canRequestCertification` | Mobile achievements (ADR-016) |
| `visibility.ts` | `AUDIENCE_OPTIONS`, `AUDIENCE_LABELS`, `AUDIENCE_DEFAULTS` (achievements Public; clubs and metrics Private), `audienceDefaultLabel` | Mobile visibility settings (ADR-013, ADR-014) |
| `membership-view.ts` | `partitionMemberships`: invitations, active, and history (newest first); rejected invitations are dropped | Mobile Clubs tab |
| `metrics-view.ts` | `METRIC_RANGES`, `rangeStart`, `filterEntriesByRange`, `needsMoreEntries` (page until the range is covered; all time stops at `ALL_TIME_ENTRY_CAP` = 200), `isEntryListTruncated`, `formatMetricValue` | Mobile Performance tab |

Run the tests with `yarn turbo test --filter=@packages/shared-logic`.
