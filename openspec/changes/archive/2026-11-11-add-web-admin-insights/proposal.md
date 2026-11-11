# Proposal

## Why

The admin console (`add-web-portal-shell`) can manage one club at a time, but an admin can't see the platform as a whole. They can't see how many clubs lack a trainer, which trainer invitations are about to expire, every trainer across clubs, or who changed what. Finding a club also means paging through the list. Every admin write is already recorded in the admin action log, but nothing can read it. This change adds an overview, a cross-club trainer directory, an activity log viewer and club search, with the admin API reads they need.

## What Changes

- **Overview (`/admin`).** It replaces the redirect to the club list and becomes the admin landing page after sign-in. It shows:
  - counts: active and deactivated clubs, active clubs with no active trainer, active trainers, pending trainer invitations, and those expiring within 48 hours
  - the five most recent admin actions, linking to the activity page

  The club and trainer counts link to the matching filtered list. The two invitation counts aren't links: there's no cross-club invitation list (each club's invitations stay on its trainers page). All six counts come from one consistent database snapshot.
- **Trainer directory (`/admin/trainers`).** Every trainer assignment across clubs, newest first, with its club, access, "Invited as" email (or "Provisioned before invitations") and dates. Access has three states, following ADR-017:
  - **Active:** not revoked, at an active club.
  - **Club deactivated:** not revoked, but the club is deactivated, so the trainer has no access.
  - **Revoked.** It can be filtered by access state and by club name, and pages with Load more. Revoking stays on the club's trainers page; the directory links there. There is no search by email, so email addresses never appear in request URLs.
- **Activity log (`/admin/activity`).** The admin action log, newest first, with Load more. Each entry shows:
  - the action in words ("Deactivated club", "Invited a trainer", …)
  - its club, with a link
  - who acted: "You", or the acting admin's email, looked up from Supabase Auth. "An admin" is shown when the lookup fails or the account no longer exists.
  - the time
  - non-sensitive details: changed field names, cancelled counts

  It can be filtered by action and by club. A club's detail page links to its activity.
- **Club search and trainer filter.** The club list gets a search box matching name or slug, and a "No active trainer" filter, both combined with the Active/Deactivated/All filter. The overview's "clubs without a trainer" count links to it.
- **New admin API reads** on the existing `admin` router:
  - `admin.getOverview`
  - `admin.listTrainers`
  - `admin.listActions`
  - optional `query` and `withoutActiveTrainer` inputs on `admin.listClubs`

  All are admin-only and checked on every call.
- **Admin action log becomes readable to admins, through the API only.** The table's database policies don't change: no client role can read it directly. The admin API is the only reader.
- **Admin email lookup.** A new narrow service-role function returns an auth user's email by id, for the activity log only. It follows the existing pattern in `apps/api/src/lib/supabaseAdmin.ts`, with a short in-memory cache. Emails are never logged.

### Out of scope

- Club applications, document review, trainer permissions, exports, and email search.
- Athlete counts or any athlete data on the overview (admin authority covers clubs and trainers only).
- Reading the security `audit_log`, which stays actor-scoped.
- Revoking from the directory, and bulk actions.
- Admin names or profiles; the only identity is the auth email.

## Capabilities

### New Capabilities
- `admin-platform-insights`: the admin-only reads: platform overview counts, the cross-club trainer directory, and the admin action log, with acting-admin emails.
- `web-admin-insights-view`: the web overview, trainer directory and activity pages.

### Modified Capabilities
- `platform-admin-access`:
  - "Admin authority is limited to clubs and trainer access" adds reading platform counts, the trainer directory and the admin action log.
  - "The admin action log is written only by the API and never by clients" allows admins to read it through the API, while direct client access stays denied.
- `club-administration`: "Admins list clubs" adds an optional name or slug search and a filter for clubs with no active trainer.
- `web-admin-club-management-view`:
  - "Admin lands on the club list" moves the landing to the overview and adds the search box and the "No active trainer" filter.
  - "The console shows no athlete data or unsupported controls" now allows the activity log and club search, and keeps everything else excluded.
- `web-portal-shell`: "The admin area is shown only to admins" now opens on the overview instead of the clubs page.

## Impact

- **API (`apps/api`):**
  - three new procedures and one new optional input on the `admin` router (no new router), in a new `services/adminInsights.ts`
  - a new `AdminDirectory` port in `lib/supabaseAdmin.ts` (`getUserEmail`)
  - integration tests for success, invalid input, 401, 403 (non-admin) and pagination
- **External call:** `admin.listActions` calls Supabase Auth to resolve acting-admin emails. It's an exception to "don't call external APIs from procedures", limited to one call per distinct actor not in the cache. It needs owner confirmation.
- **Validators:**
  - new input and output schemas in `admin-action-log.ts` and `club.ts`
  - `query` on `listAdminClubsInput`
  - Admin emails in output are L1, shown only to admins.
- **API client:** hooks for the new procedures. Club mutations also refresh the overview and activity.
- **Web (`apps/web`):**
  - the `/admin` overview, `/admin/trainers` and `/admin/activity` pages
  - search on `/admin/clubs`, and an activity link on the club detail page
  - sidebar nav items, and `ADMIN_LANDING` becomes `/admin`
- **RLS:** no policy change. The header comment in `supabase/policies/admin_action_log.sql` ("Admins have no read surface for this log in the application") is updated to name the admin API read. It's a comment-only edit, confirmed with the owner.
- **No changes** to the Prisma schema, migrations, dependencies or environment variables. `SUPABASE_SERVICE_ROLE_KEY` is already required in production.
- **Docs:**
  - `apps/web/README.md` and `docs/project-architecture.md` (the admin read path, including the email lookup)
  - `docs/design-handoff/README.md` and its CHANGELOG (the overview replaces A1; the activity log is the admin action log, not a product feed)
