# Tasks

## 1. Confirmations

- [x] 1.1 STOP and get the owner's explicit confirmation for each item below (AGENTS.md "Explicit confirmation required", "Performance rules" and "Logging Rules"). Verify: the owner's reply is recorded here before task 2.1.
  - Admins read the admin action log through the API: the new `admin.listActions` procedure, and the `platform-admin-access` spec change. RLS policies are unchanged.
  - A comment-only edit to the header of `supabase/policies/admin_action_log.sql` that names the admin API read. No policy, grant or `ALTER` changes.
  - `admin.listActions` calls Supabase Auth (`auth.admin.getUserById`) through a new `AdminDirectory` service-role port, with a 5-minute cache (design D2). This is an exception to "don't call external APIs from tRPC procedures". Acting-admin emails are returned to admins and never logged.
  - Three new procedures and one new optional input on the existing `admin` router; no router is added or renamed.
  - The admin landing changes from `/admin/clubs` to `/admin`.
  - **Owner reply (2026-11-10): "Approve all 5".** All five items above are approved.

## 2. Validators

- [x] 2.1 Add `adminOverviewOutput`, `listAdminTrainersInput`, `adminTrainerDirectoryEntryOutput` and its list, `listAdminActionsInput`, and `adminActionEntryOutput` and its list to `packages/validators/src/admin-action-log.ts` and `club-trainer-invitation.ts`. Add `query` and `withoutActiveTrainer` to `listAdminClubsInput` in `club.ts`. The directory entry carries `access` (`ACTIVE` | `CLUB_DEACTIVATED` | `REVOKED`), not the raw status. Every field gets an L-level comment, and everything is exported from the index (design D1). Verify with tests:
  - the inputs reject a 1-character and a 101-character `query`/`clubQuery`, an unknown action, an unknown `access`, a non-cuid `clubId` and `take: 51`
  - the L2 key walk finds nothing
  - `adminActionEntryOutput` has no `requestId`, `actorUserAccountId` or `supabaseUserId` key
  - the directory entry has no `userAccountId`
  - `yarn turbo run test --filter=@packages/validators` passes

## 3. API

- [x] 3.1 Add the `AdminDirectory` port (`getUserEmail`) and `createSupabaseAdminDirectory()` to `apps/api/src/lib/supabaseAdmin.ts`, with the 5-minute, 100-entry cache in `services/adminInsights.ts` (design D2). Verify with unit tests using a fake client:
  - a second call within the TTL makes no lookup
  - an error isn't cached and returns null
  - a missing user returns null
  - the warn log carries `requestId` and the error name only
- [x] 3.2 Add `admin.getOverview`, with the six counts in one `RepeatableRead` transaction and the shared `clubsWithoutActiveTrainerWhere` (design D1). Verify with integration tests that read, add fixtures, read again and assert deltas (design D5):
  - an active club with no trainer raises `activeClubs` and `activeClubsWithoutTrainer`
  - a trainer assignment lowers `activeClubsWithoutTrainer` and raises `activeTrainers`
  - a revoked assignment doesn't count
  - a deactivated club moves between the two club counts
  - invitations expiring in 1 h and 47 h count as pending and expiring; one at 72 h counts as pending only; an expired one counts as neither
  - a non-revoked assignment at a deactivated club doesn't count as an active trainer
  - snapshot consistency: while a parallel loop deactivates and reactivates a fixture club 20 times, 20 concurrent overview reads each give the same `activeClubs + deactivatedClubs`, equal to the club total read before the loop
  - `generatedAt` is present and within the request window
  - a non-admin gets 403; signed out gets 401
  - the output has no athlete key
- [x] 3.3 Add `admin.listTrainers`, extracting the "Invited as" mapping shared with `listClubTrainers` (design D1). Verify with integration tests:
  - assignments from two fixture clubs are both returned, newest first
  - access states: a non-revoked assignment at a deactivated fixture club is `CLUB_DEACTIVATED`, excluded by `ACTIVE` and returned by `CLUB_DEACTIVATED`; after reactivating the club it's `ACTIVE`; a revoked one at a deactivated club is `REVOKED`
  - the `REVOKED` and `ACTIVE` filters
  - the response has no raw `status` key
  - `clubQuery` matches case-insensitively
  - a redacted invitation gives a null `invitedEmail`
  - pagination with `take: 1` and its cursor
  - 403 non-admin, 401 signed out, 400 `take: 51`
  - the existing `listClubTrainers` tests pass unchanged
- [x] 3.4 Add `admin.listActions` with the injected `AdminDirectory` (design D1, D2). Verify with integration tests on fixture clubs, using a fake directory:
  - after creating, updating and deactivating a fixture club, and inviting and revoking at it, `clubId` returns exactly those records newest first, including the trainer and invitation ones (via `metadata.clubId`)
  - the `action` filter
  - own rows have `isYou: true` and `email: null`
  - another admin's row has the fake email, or null when the fake returns null or throws
  - details contain `changedFields` for an update and the counts for a deactivation, and no `clubId`/`requestId`
  - listing creates no new log row
  - 403 non-admin, 401 signed out, 400 `take: 51`
- [x] 3.5 Add `query` and `withoutActiveTrainer` to `admin.listClubs`. Verify with integration tests:
  - a name fragment and a slug fragment both match, combined with `status: 'DEACTIVATED'`
  - `withoutActiveTrainer` returns a fixture club with no trainer and one whose only trainer is revoked, and excludes one with an active trainer
  - its delta matches `getOverview`'s `activeClubsWithoutTrainer` delta over the same fixtures
  - a 1-character query gets 400
  - existing `listClubs` tests pass
- [x] 3.6 Update the header comment of `supabase/policies/admin_action_log.sql` (only after the task 1.1 approval) and the API docs that list admin procedures. Verify:
  - `git diff supabase/policies/admin_action_log.sql` shows comment lines only
  - with the Azure container app stopped, `yarn turbo run typecheck test lint --filter=@app/api` passes, including `tests/rls/admin_action_log.test.ts`

## 4. API client

- [x] 4.1 Add `useAdminOverview`, `useAdminTrainers` (infinite) and `useAdminActions` (infinite) to `packages/api-client/src/hooks/admin.ts`. Add the design D4 invalidations to the existing admin mutation hooks. Verify:
  - a test with a test `QueryClient` proves each admin mutation also invalidates `admin.getOverview` and `admin.listActions`, and that the trainer mutations invalidate `admin.listTrainers`
  - `turbo typecheck` passes for `@app/mobile`

## 5. Web

- [x] 5.1 Build the `/admin` overview (design D3): count cards with links, the recent activity panel, and loading, error and empty states. Set `ADMIN_LANDING` to `/admin`, and update the sidebar (Overview, Clubs, Trainers, Activity), marking Overview current on an exact match only. Verify:
  - `chooseLanding` returns `/admin` for an admin
  - a component test with a stubbed API shows:
    - the six counts and "Updated <time>"
    - the links `/admin/clubs?status=DEACTIVATED`, `/admin/clubs?status=ACTIVE&trainers=none` and `/admin/trainers?access=ACTIVE`
    - no link on the two invitation counts
    - the retryable error state
  - a `SidebarNav` test proves `/admin/clubs` doesn't mark Overview
- [x] 5.2 Build `/admin/trainers` (design D3). Verify:
  - a component test shows:
    - rows from two clubs
    - "Provisioned before invitations" for a null email
    - a `CLUB_DEACTIVATED` row labelled "Club deactivated" and never "Active", with the club marked deactivated
    - the access filter in the URL
    - a club search sent only from 2 characters
    - the row link to the club's trainers page
  - manual: revoke on the club page, then the directory shows Revoked without a reload
- [x] 5.3 Build `/admin/activity` with `describeAdminAction()` and the filters (design D3), and add "View activity" to the club detail page. Verify:
  - unit tests for `describeAdminAction` cover all 7 actions with "You", an email and "An admin"
  - a component test proves the club filter from `?club=` shows the chip and sends `clubId`
  - the details render "Changed: name, city" and the cancelled counts
- [x] 5.4 Add the club list search and the "No active trainer" filter (design D3). Verify:
  - a component test proves `?trainers=none` sends `withoutActiveTrainer: true` together with the status filter, and shows its empty state
  - a component test proves typing one character sends no `query`, two characters send it, it's kept in `?q=` with the status filter, and no match shows "Clear search"
  - the existing club list tests pass

## 6. Docs

- [x] 6.1 Update `apps/web/README.md` (routes, landing), `docs/project-architecture.md` (admin read path and the email lookup), and `docs/design-handoff/README.md` plus its CHANGELOG (the overview replaces A1; activity is the admin action log, not a product feed; no email search). Verify: every new route and procedure appears in the docs.

## 7. Integration

- [x] 7.1 Ask the owner to stop the Azure container app, then run `turbo typecheck && turbo test && turbo lint` and `next build`. Verify: all pass. Record in a handoff note the changed files, the satisfied spec requirements, and the manual checks run with their results. Among them:
  - the overview counts after creating and deactivating a club
  - the activity log showing a second admin's email
  - an athlete opening `/admin` and seeing "not authorized"
  - club search
