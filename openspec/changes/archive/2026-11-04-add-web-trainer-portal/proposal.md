# Proposal

## Why

Trainers can accept an invitation on the web (`add-web-portal-shell`), but after that they have nothing to do there. The API already lets a trainer list their club's roster, invite athletes, report metric entries and decide certification requests, yet no page reaches any of it, and the API can't tell a trainer which clubs they train. This change adds the trainer's work screens and the few small read procedures those screens need.

## What Changes

- **Which clubs I train.** A new query returns the signed-in user's own trainer assignments at active clubs. After sign-in, a non-admin lands on `/trainer`, which opens the only club directly, shows a club picker when there are several, and points to the invitations page when there are none. The sidebar shows the current club and lets the trainer switch clubs.
- **Roster (`/trainer/clubs/[clubId]/athletes`).** Active athletes and the invitations this trainer sent that are still pending, each with the athlete's public name and sport. Load more pages through the list.
- **Invite an athlete.** An invite dialog finds the athlete two ways:
  - **Profile link or handle:** paste the athlete's public profile link or handle (their `slug`). This works even for athletes who aren't searchable.
  - **Search:** by name, among athletes who chose to be searchable.

  A new trainer-only lookup returns only public identity (`displayName`, `slug`, sport) and whether the athlete is already a member or was invited by this trainer. Sending the invitation uses the existing `club.inviteAthlete`; the membership stays pending until the athlete confirms.
- **Athlete page (`/trainer/clubs/[clubId]/athletes/[athleteId]`).** For an active member:
  - the athlete's metric summaries (latest and best) and their entries, newest first, attributed to the reporting club
  - a "Log metric" dialog: metric (the catalog for the athlete's sport plus general metrics), value and measured date; saved entries are described as trainer-reported and can't be edited or deleted
  - a new trainer-only query that loads one roster athlete, so the page works from a direct link

  For a pending invitee, the page shows only that the invitation awaits the athlete's confirmation.
- **Certification queue (`/trainer/clubs/[clubId]/certifications`).** The club's pending requests: achievement title, organization, date and the athlete's public name. Approve, or reject with a required reason, each confirmed in a dialog. A decided request leaves the queue without a reload.
- **Roster rows show the athlete's sport.** It's public data, and the log-metric dialog needs it to offer that sport's metrics.
- **States and access.** Every page has loading, empty and error states, works by keyboard and fits from 1024 px up, like the shell. A user who isn't a trainer of the club in the URL sees a "not a trainer of this club" page; the API still checks every call.
- **Data stays current.** Inviting, logging a metric and deciding a request refresh the affected lists and summaries without a reload.

### Out of scope

- The prototype's club dashboard (T1), event groups, sessions, attendance, CSV export, messages and the athlete achievements tab.
- Inviting trainers or staff, email lists and share links (admins invite trainers).
- Cancelling an athlete invitation, and editing or deleting metric entries (entries are append-only).
- Evidence files, "ask for info" on certification requests, and the trainer seeing an athlete's other achievements.
- Showing which trainer reported an entry; entries are attributed to the club.
- Mobile: it stays athlete-only.

## Capabilities

### New Capabilities
- `web-trainer-portal-view`: how a trainer picks a club, views the roster, invites athletes, views an athlete's metrics and logs entries, and decides certification requests on the web.
- `trainer-club-workspace`: the trainer-only reads the portal needs: the caller's own clubs, one roster athlete, the lookup of an athlete to invite, and the athlete's sport on roster rows.

### Modified Capabilities
- `trainer-access-boundary`: "Trainers read only club-scoped data" gains one explicit exception. When inviting, a trainer may look up an athlete's public identity only: name, handle and sport, for searchable athletes by name, or for any athlete by exact handle. It grants no access to metrics, memberships, achievements or private data.

## Impact

- **API (`apps/api`):** new procedures on the existing `club` router (no new router): `listMyTrainerClubs` (protected), `getRosterAthlete` and `findAthleteToInvite` (trainer). `listRoster` adds the athlete's sport to each row. Service functions live in `services/membership.ts` or a new `services/trainerWorkspace.ts`. Integration tests cover success, invalid input, 401, 403 (another club) and 404.
- **Validators (`@packages/validators`):** new input and output schemas for the three procedures; `clubRosterEntryOutput.athlete` gains `sport` (L0). No L2 field, no internal trainer id in any output.
- **API client (`@packages/api-client`):** hooks for the new procedures, and cache invalidation for `inviteAthlete`, `reportEntry` and `decideCertification`.
- **Web (`apps/web`):** the trainer routes above, the club switcher in the trainer shell, the post-sign-in landing for non-admins (`/trainer`), and new dialogs built on the existing components.
- **No changes** to the Prisma schema, migrations, RLS policies, dependencies or environment variables.
- **Mobile:** unaffected. The roster output change is additive, and mobile doesn't call `listRoster`.
- **Docs:** `apps/web/README.md` (routes), `docs/design-handoff/README.md` and CHANGELOG (trainer portal exceptions), `apps/api` router docs if they list procedures.
