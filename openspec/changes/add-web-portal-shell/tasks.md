# Tasks

## 1. Prerequisites and confirmations

- [ ] 1.1 Confirm `add-admin-club-trainer-management` is applied: `admin.*` (including `whoAmI`) and `trainerInvitation.*` exist in `router/index.ts`, and their hooks are exported from `@packages/api-client`. Verify: `turbo typecheck` passes on this branch after rebasing onto the applied admin branch. If they're missing, STOP and report; this change can't start before them.
- [ ] 1.2 STOP and get the owner's explicit confirmation for each item below (AGENTS.md "Explicit confirmation required"). Verify: the owner's reply is recorded before task 2.1.
  - New dependencies in `apps/web`: `tailwindcss@^3.4`, `postcss`, `autoprefixer`, `vitest`, with the reason for each (design D5, D9).
  - Supabase Auth configuration: add the local and deployed `/auth/callback` redirect URLs, and keep `{{ .Token }}` in the Magic Link template (design D1).
  - Deleting the placeholder files in `apps/web` listed in design D8. No test files are deleted.

## 2. Tooling and tokens

- [ ] 2.1 Install the approved dependencies. Add `postcss.config.js`, `tailwind.config.ts` (reading the shared tokens through `lib/tokens.ts`, design D5) and `app/globals.css`. Load Inter and JetBrains Mono with `next/font/google`. Verify: `yarn turbo run build --filter=@app/web` succeeds, and a page using `bg-ink text-on-ink` renders the handoff colors.
- [ ] 2.2 Add the web-only shell colors to `docs/design-handoff/tokens/colors.ts`, with a comment for each and a CHANGELOG entry. Mirror them in `apps/mobile/lib/tokens.js` only if mobile's token sync check requires it. Verify: `turbo typecheck` and `turbo lint` pass for `@app/mobile` and `@app/web`.
- [ ] 2.3 Add `vitest.config.ts` to `apps/web` and change the `"test"` script to `vitest run`. Verify: `yarn turbo run test --filter=@app/web` runs (with a trivial first test that later tasks replace).

## 3. Server-side auth and session

- [ ] 3.1 Create `lib/supabase-server.ts` (design D1: per-request client from `createSsrServerClient`; forced `httpOnly`, `sameSite: 'lax'`, `path: '/'`, and `secure` except on localhost) and `lib/safe-next.ts` (design D2). Verify with unit tests:
  - cookie options are forced even when Supabase passes `httpOnly: false`
  - `safeNext` accepts `/admin/clubs?status=ALL` and rejects `https://evil.test`, `//evil.test`, `/\evil.test` and control characters
- [ ] 3.2 Create `middleware.ts` (design D2: refresh through `getUser()`; guard `/admin/:path*` and `/trainer/:path*`; copy pending cookies onto redirects; matcher excludes static assets). Verify with unit tests:
  - a sessionless `/admin/clubs` request redirects to `/login?next=%2Fadmin%2Fclubs`
  - a request whose session was refreshed returns the new `Set-Cookie` headers on both the pass-through and the redirect response
- [ ] 3.3 Build `/login` (email step, then code step), the server actions `requestSignIn`, `verifyCode` and `signOut`, and the `/auth/callback` route handler (design D1). Choose the landing with `safeNext` and `admin.whoAmI`. Verify: unit tests prove the request step shows the same message for known and unknown emails and that the callback redirects only through `safeNext`. Then check manually against local Supabase:
  - sign in by link
  - sign in by code
  - a wrong code shows the retry message and creates no session
  - `localStorage`, `sessionStorage` and `document.cookie` show no token, and the session cookies are `HttpOnly`

## 4. API path

- [ ] 4.1 Add the subpath export `@packages/api-client/server` with `createServerApiClient({ url, getToken })` (vanilla `createTRPCClient`, `httpLink`, `superjson`; no React imports), and its `package.json` `exports` entry (design D3). Verify:
  - `turbo typecheck` and `turbo lint` pass
  - a test imports it in a Node environment without React installed in the test's module graph
- [ ] 4.2 Build the proxy `app/api/trpc/[trpc]/route.ts` and `lib/api-origin.ts` (design D3). Verify with unit tests against a stubbed upstream `fetch`:
  - a single GET keeps the path and the `input` query
  - a batched GET keeps `a,b` and `?batch=1&input=…`
  - single and batched POST bodies arrive byte-identical
  - `authorization` is absent without a session and present with one
  - `cookie` and client `authorization` are never forwarded
  - a cross-origin POST and a POST without `Origin` both get 403 with no upstream call
  - cookies refreshed during the request are on the response
  - upstream status and `content-type` are passed through
  - the logger is never called with headers or the body
- [ ] 4.3 Rewrite `components/providers.tsx` to mount `ApiProvider apiUrl="/api/trpc" getToken={async () => null}` with a query-client `onError` that sends `UNAUTHORIZED` to `/login?next=<current path>`. Add `lib/server-api.ts`. Delete the placeholders listed in design D8. Verify: `turbo typecheck` passes for `@app/web`, and `grep -rn "get-token\|createBrowserClient" apps/web` returns nothing.

## 5. Shell and components

- [ ] 5.1 Port the components listed in design D6 into `apps/web/components/`, typed and styled with Tailwind, with a single visible focus ring. Verify:
  - unit tests prove `Dialog` closes on Escape and returns focus to its opener, and `StatusChip` renders every state label
  - `turbo lint` passes with no `react-native` imports
- [ ] 5.2 Build `components/not-authorized.tsx`, plus the admin and trainer layouts using `PortalShell` (role labels and tones from the prototype, `lang="en"` on the portal root, sign-out in the user block). Build `app/(admin)/admin/layout.tsx` with the `admin.whoAmI` guard (design D4), and make `/admin` redirect to `/admin/clubs`. Verify manually with seeded accounts:
  - an athlete and a trainer see "not authorized" and the network log shows no admin data request succeeding
  - an admin sees the admin shell
  - at 1024 px wide no page scrolls horizontally

## 6. Admin pages

- [ ] 6.1 Build `/admin/clubs`: list, Active/Deactivated/All filter, Load more, empty state with Create club, loading and error states, and `ClubFormDialog` for creating a club (client-side `createClubInput` validation, slug-taken message on `CONFLICT`) (design D7). Verify manually:
  - create a club and see it appear as Active
  - a duplicate slug shows the message and creates nothing
  - an empty filter shows the empty state
  - with more than 20 clubs seeded, Load more appends the next page
- [ ] 6.2 Build `/admin/clubs/[clubId]`: details, edit form with read-only slug, Deactivate and Reactivate with `ConfirmDialog` copy from the spec, cancelled counts after deactivation, and the "Club not found" state. Verify manually:
  - deactivating a seeded club with a pending certification request, an athlete invitation and a trainer invitation shows counts 1/1/1 and the Deactivated chip
  - closing the dialog changes nothing
  - reactivating shows the "stay cancelled" copy
- [ ] 6.3 Build `/admin/clubs/[clubId]/trainers`:
  - trainers table ("Invited as …" / "Provisioned before invitations")
  - invitations table with state chips including Expired
  - invite dialog and `InviteInstructions` (address, expiry, Copy link)
  - revoke-invitation and revoke-trainer confirmations
  - invite disabled with an explanation when the club is deactivated

  Verify:
  - a unit test for `InviteInstructions` covers the exact address and the formatted expiry
  - manual checks: invite, then a Pending row and the instructions; a duplicate shows the conflict message; revoking a trainer shows Revoked; a seeded expired invitation shows Expired

## 7. Trainer invitations page

- [ ] 7.1 Build `/trainer/invitations` (design D7):
  - the email line from the server session
  - an unconfirmed-email message
  - the list with Accept and Decline (decline confirmed)
  - the accepted confirmation
  - "no longer available" with a refetch on `NOT_FOUND`/`BAD_REQUEST`
  - the separate-account message on `FORBIDDEN`
  - an empty state suggesting the invited address

  Verify manually, end to end on local Supabase:
  - an admin invites a new email; that person signs in on the web, sees the invitation, accepts, and the admin's trainers table shows them as active "Invited as" that address
  - an athlete account signing in with an invited email gets the separate-account message and the invitation stays Pending
  - declining removes the invitation
  - revoking an invitation and then accepting it on the trainer page shows "no longer available"

## 8. Docs and handoff

- [ ] 8.1 Write `apps/web/README.md` (auth flow, proxy, environment variables, how to run tests). Update `docs/project-architecture.md` with the web sign-in and proxy flow. Verify: every environment variable the README lists exists in `env.example` (no new ones), and the architecture doc names the proxy route.
- [ ] 8.2 Add the web deviations to "Intentional handoff exceptions" in `docs/design-handoff/README.md`, with a CHANGELOG entry:
  - A1 replaced by the club list
  - no applications, documents, activity feed, permissions or search
  - invite modal with email only
  - "Suspended" renamed "Deactivated"
  - `/trainer/invitations` with no artboard
  - fixed widths replaced by a 1024 px minimum layout

  Verify: each unsupported surface named in `WEB-AUDIT.md` appears in the list.

## 9. Integration

- [ ] 9.1 Run `turbo typecheck && turbo test && turbo lint`. Verify: all pass. List the changed files and the satisfied spec requirements in the handoff note, and record which manual checks from groups 3, 5, 6 and 7 were run and their results.
