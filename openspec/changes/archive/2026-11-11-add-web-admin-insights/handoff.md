# Handoff — add-web-admin-insights

Date: 2026-11-10. Branch: `feat/add-web-admin-insights`.

## Checks run by the agent

| Check | Result |
|---|---|
| `yarn turbo run build typecheck lint` (all packages) | Pass (typecheck rerun after build; running it in parallel with `next build` races on `.next/types`) |
| `next build` (`@app/web`) | Pass; `/admin`, `/admin/trainers`, `/admin/activity` built |
| `@packages/validators` tests | Pass (146) |
| `apps/api` unit test `admin-email-lookup.test.ts` | Pass (8) |
| `apps/web` vitest (all files) | Pass (200) |
| `@app/mobile` typecheck | Pass |

## Run by the owner (shared DB and Redis; Azure container stopped)

Integration tests and manual checks were run by the owner on 2026-11-11 and reported as passing.

1. `yarn turbo run typecheck test lint --filter=@app/api`. It includes:
   - `src/__tests__/integration/admin-insights.int.test.ts` (tasks 3.2–3.5: overview deltas and snapshot consistency, directory access states and pagination, action log club/action filters and actors, club search and the trainer filter)
   - `src/__tests__/integration/admin-router.int.test.ts` (401/403/400 for the new procedures)
   - `tests/rls/admin_action_log.test.ts` (task 3.6)
   - the existing `listClubTrainers` and `listClubs` tests
2. `turbo typecheck && turbo test && turbo lint` (task 7.1).
3. Manual checks (tasks 5.2 and 7.1):
   - [x] Revoke a trainer on a club's trainers page, then open `/admin/trainers`: the row shows Revoked without a reload.
   - [x] Create and deactivate a club, then open `/admin`: the counts and recent activity include both.
   - [x] A second admin acts; `/admin/activity` shows that admin's email.
   - [x] An athlete opens `/admin` and sees "not authorized".
   - [x] Club search on `/admin/clubs` (2+ characters, kept in `?q=`, "Clear search" on no match).

Tasks 3.2–3.6, 5.2 and 7.1 are ticked on that report.

## Changed files

- Validators: `packages/validators/src/{admin-action-log,club,club-trainer-invitation}.ts`, new `admin-insights.test.ts`
- API:
  - `apps/api/src/lib/supabaseAdmin.ts` (AdminDirectory)
  - `router/admin.ts`
  - new `services/adminInsights.ts`
  - `services/adminClubs.ts` (search, shared no-trainer `where`)
  - `services/trainerInvitations.ts` (shared `resolveInvitedEmails`)
- API tests:
  - new `__tests__/admin-email-lookup.test.ts`
  - new `integration/admin-insights.int.test.ts`
  - `integration/admin-router.int.test.ts`
  - `integration/helpers/setup.ts` (club cleanup also removes trainer and invitation log rows)
- RLS: `supabase/policies/admin_action_log.sql` (header comment only)
- API client: `packages/api-client/src/hooks/admin.ts`, `src/index.ts`
- Web:
  - `app/(admin)/admin/{page,overview-view,layout}.tsx`
  - `activity/*`
  - `trainers/*`
  - `clubs/clubs-view.tsx`
  - `clubs/[clubId]/club-detail-view.tsx`
  - `insights-views.test.tsx`
  - `components/{icon,sidebar-nav,status-chip}.tsx` (+ test)
  - `lib/{admin-actions,admin-nav,href,use-debounced}.ts`
  - `lib/auth-flow.ts`
  - `lib/portal-mutations.ts`
  - landing test updates in `lib/auth-flow.test.ts`, `app/auth/actions.test.ts`, `app/auth/callback/route.test.ts`
  - `lib/portal-mutations.test.tsx`
- Docs:
  - `apps/web/README.md`
  - `docs/project-architecture.md`
  - `docs/design-handoff/{README,CHANGELOG}.md`

## Spec requirements covered

- admin-platform-insights: overview counts (one REPEATABLE READ snapshot), cross-club trainer directory, admin action log
- platform-admin-access: admin authority read scope; the log is read only through the admin API, with RLS unchanged
- club-administration: club list search and the no-active-trainer filter
- web-admin-insights-view: overview, directory, activity page, insight pages stay current, admin navigation
- web-admin-club-management-view: landing on the overview, search and filter, no athlete data
- web-portal-shell: an admin opens on the overview

## Deviations from design

- D4: every admin mutation invalidates `getOverview`, `listActions` and `listTrainers`, not only the trainer and invitation ones. Deactivating, reactivating and renaming a club also change directory rows, and the spec requires the directory to stay current.
- The 4.1 invalidation test lives in `apps/web/lib/portal-mutations.test.tsx`, which already uses a real QueryClient, so no test dependencies were added to `api-client`.
