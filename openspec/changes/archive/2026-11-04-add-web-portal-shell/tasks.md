# Tasks

## 1. Prerequisites and confirmations

- [x] 1.1 Confirm `add-admin-club-trainer-management` is applied: `admin.*` (including `whoAmI`) and `trainerInvitation.*` exist in `router/index.ts`, and their hooks are exported from `@packages/api-client`. Also confirm the admin change's D4 contract fix: `trainerInvitation.accept`/`decline` return `NOT_FOUND`, not `FORBIDDEN`, when the club is no longer active. Verify: `turbo typecheck` passes on this branch after rebasing onto the applied admin branch, and the admin change's integration test asserts `NOT_FOUND` for "accepting for a club deactivated meanwhile". If either is missing, STOP and report; this change can't start before them.
- [x] 1.2 STOP and get the owner's explicit confirmation for each item below (AGENTS.md "Explicit confirmation required"). Verify: the owner's reply is recorded before task 2.1.
  - New dependencies in `apps/web`: `tailwindcss@^3.4`, `postcss`, `autoprefixer`, `vitest`, with the reason for each (design D5, D9).
  - Supabase Auth configuration: add the local and deployed `/auth/callback` redirect URLs, and keep `{{ .Token }}` in the Magic Link template (design D1).
  - Deleting the placeholder files in `apps/web` listed in design D8. No test files are deleted.
  - Changing `@packages/api-client`: the `server` subpath export and the optional `ApiProvider` `onUnauthorized` prop, which also stops retrying unauthorized queries on mobile (design D3, D11).
  - Adding `WEB_URL` to the `@app/web#build` env in `turbo.json`, and requiring `WEB_URL` in every web deployment (design D10). No environment file in the repo changes.
  - **Owner reply (2026-11-03):** all five items approved; Supabase Auth config confirmed by the owner. Also approved: `jsdom@^25`, `@testing-library/react@^16` and `@testing-library/dom` as `apps/web` devDependencies for component tests (same versions as `@packages/auth`).

## 2. Tooling and tokens

- [x] 2.1 Install the approved dependencies. Add `postcss.config.js`, `tailwind.config.ts` (reading the shared tokens through `lib/tokens.ts`, design D5) and `app/globals.css`. Load Inter and JetBrains Mono with `next/font/google`. Verify: `yarn turbo run build --filter=@app/web` succeeds, and a page using `bg-ink text-on-ink` renders the handoff colors.
- [x] 2.2 Add the web-only shell colors to `docs/design-handoff/tokens/colors.ts`, with a comment for each and a CHANGELOG entry. Mirror them in `apps/mobile/lib/tokens.js` only if mobile's token sync check requires it. Verify: `turbo typecheck` and `turbo lint` pass for `@app/mobile` and `@app/web`.
- [x] 2.3 Add `vitest.config.ts` to `apps/web` and change the `"test"` script to `vitest run`. Verify: `yarn turbo run test --filter=@app/web` runs (with a trivial first test that later tasks replace).

## 3. Server-side auth and session

- [x] 3.0 Create `lib/app-origin.ts` (design D10) and add `WEB_URL` to the `@app/web#build` env in `turbo.json`. Verify: unit tests prove `http://localhost:3000` and `https://portal.example.co` give the expected `APP_ORIGIN`, and a missing value, a value with a path, or `javascript:` throw.
- [x] 3.1 Create `lib/supabase-server.ts` (design D1: per-request client from `createSsrServerClient`; forced `httpOnly`, `sameSite: 'lax'`, `path: '/'`, and `secure` except on localhost) and `lib/safe-next.ts` (design D2). Verify with unit tests:
  - cookie options are forced even when Supabase passes `httpOnly: false`
  - `safeNext` accepts `/admin/clubs?status=ALL` and rejects `https://evil.test`, `//evil.test`, `/\evil.test` and control characters, resolving against `APP_ORIGIN`
- [x] 3.2 Create `middleware.ts` (design D2: refresh through `getUser()`; guard `/admin/:path*` and `/trainer/:path*`; copy pending cookies onto redirects; matcher excludes static assets). Verify with unit tests:
  - a sessionless `/admin/clubs` request redirects to `/login?next=%2Fadmin%2Fclubs`
  - a request whose session was refreshed returns the new `Set-Cookie` headers on both the pass-through and the redirect response
  - with `Host: evil.test` and `X-Forwarded-Host: evil.test`, the redirect still targets `APP_ORIGIN`
- [x] 3.3 Build `/login` (email step, then code step), the server actions `requestSignIn`, `verifyCode` and `signOut`, and the `/auth/callback` route handler (design D1). Choose the landing with `safeNext` and `admin.whoAmI`. Verify: unit tests prove the request step shows the same message for known and unknown emails, `emailRedirectTo` is built from `APP_ORIGIN` even with a spoofed `Host`, and the callback redirects only through `safeNext` to `APP_ORIGIN`. Then check manually against local Supabase:
  - sign in by link
  - sign in by code
  - a wrong code shows the retry message and creates no session
  - `localStorage`, `sessionStorage` and `document.cookie` show no token, and the session cookies are `HttpOnly`

## 4. API path

- [x] 4.1 Add the subpath export `@packages/api-client/server` with `createServerApiClient({ url, getToken })` (vanilla `createTRPCClient`, `httpLink`, `superjson`, `fetch` with `cache: 'no-store'`; no React imports), and its `package.json` `exports` entry (design D3). Verify:
  - `turbo typecheck` and `turbo lint` pass
  - a test imports it in a Node environment without React in the test's module graph, and asserts the bearer comes from `getToken` and the fetch is `no-store`
- [x] 4.1a Add the optional `onUnauthorized` prop to `ApiProvider` (design D11: `QueryCache`/`MutationCache` `onError`, no retry on `UNAUTHORIZED`). Verify:
  - a `@packages/api-client` unit test proves it's called once for an `UNAUTHORIZED` query and once for an `UNAUTHORIZED` mutation, and never for `FORBIDDEN` or a network error
  - `turbo typecheck` passes for `@app/mobile` without changes there
- [x] 4.2 Build the proxy `app/api/trpc/[trpc]/route.ts` and `lib/api-origin.ts` (design D3). Verify with unit tests against a stubbed upstream `fetch`:
  - a single GET keeps the path and the `input` query
  - a batched GET keeps `a,b` and `?batch=1&input=…`
  - single and batched POST bodies arrive byte-identical
  - `authorization` is absent without a session and present with one
  - `cookie` and client `authorization` are never forwarded
  - a cross-origin POST and a POST without `Origin` both get 403 with no upstream call
  - a POST with spoofed `Host`/`X-Forwarded-Host` is judged only against `APP_ORIGIN`
  - the upstream fetch is called with `cache: 'no-store'`, and 200, 4xx and 5xx responses all carry `Cache-Control: private, no-store`
  - cookies refreshed during the request are on the response
  - upstream status and `content-type` are passed through
  - the logger is never called with headers or the body
- [x] 4.3 Rewrite `components/providers.tsx` to mount `ApiProvider apiUrl="/api/trpc" getToken={async () => null} onUnauthorized={…}` (navigating to `/login?next=<current path + search>`, design D11). Add `lib/server-api.ts` (design D3). Delete the placeholders listed in design D8, and replace `app/page.tsx` with the root placeholder (no redirect). Verify:
  - `turbo typecheck` passes for `@app/web`
  - `grep -rn "get-token\|createBrowserClient\|/dashboard" apps/web --exclude-dir=node_modules --exclude-dir=.next` returns nothing
  - no file with `'use client'` imports `lib/server-api`
  - manual: `/` returns 200 and its "Sign in to the portal" link opens `/login`
  - manual: with a session whose refresh token was revoked in Supabase, an admin page query sends the browser to `/login?next=` that page

## 5. Shell and components

- [x] 5.1 Port the components listed in design D6 into `apps/web/components/`, typed and styled with Tailwind, with a single visible focus ring. Verify:
  - unit tests prove `Dialog` closes on Escape and returns focus to its opener, and `StatusChip` renders every state label
  - `turbo lint` passes with no `react-native` imports
- [x] 5.2 Build `components/not-authorized.tsx`, plus the admin and trainer layouts using `PortalShell` (role labels and tones from the prototype, `lang="en"` on the portal root, sign-out in the user block). Build `app/(admin)/admin/layout.tsx` with the `admin.whoAmI` guard (design D4), and make `/admin` redirect to `/admin/clubs`. Verify manually with seeded accounts:
  - an athlete and a trainer see "not authorized" and the network log shows no admin data request succeeding
  - an admin sees the admin shell
  - at 1024 px wide no page scrolls horizontally

## 6. Admin pages

- [x] 6.1 Build `/admin/clubs`: list, Active/Deactivated/All filter, Load more, empty state with Create club, loading and error states, and `ClubFormDialog` for creating a club (client-side `createClubInput` validation, slug-taken message on `CONFLICT`) (design D7). Verify manually:
  - create a club and see it appear as Active
  - a duplicate slug shows the message and creates nothing
  - an empty filter shows the empty state
  - with more than 20 clubs seeded, Load more appends the next page
  - a unit test with a test `QueryClient` proves `createClub` invalidates `admin.listClubs` (design D7 table)
- [x] 6.2 Build `/admin/clubs/[clubId]`: details, edit form with read-only slug, Deactivate and Reactivate with `ConfirmDialog` copy from the spec, cancelled counts after deactivation, and the "Club not found" state. Verify manually:
  - deactivating a seeded club with a pending certification request, an athlete invitation and a trainer invitation shows counts 1/1/1 and the Deactivated chip
  - closing the dialog changes nothing
  - reactivating shows the "stay cancelled" copy
  - after deactivating, going back to the club list shows the club as Deactivated without a reload, and editing the name updates the list row
  - unit tests prove `updateClub`, `deactivateClub` and `reactivateClub` invalidate the keys in the design D7 table
- [x] 6.3 Build `/admin/clubs/[clubId]/trainers`:
  - trainers table ("Invited as …" / "Provisioned before invitations")
  - invitations table with state chips including Expired
  - invite dialog and `InviteInstructions` (address, expiry, Copy link)
  - revoke-invitation and revoke-trainer confirmations
  - invite disabled with an explanation when the club is deactivated

  Verify:
  - a unit test for `InviteInstructions` covers the exact address, `APP_ORIGIN` (passed as a prop) and the formatted expiry
  - unit tests prove `inviteTrainer`, `revokeTrainerInvitation` and `revokeTrainer` invalidate the keys in the design D7 table
  - manual checks:
    - invite, then a Pending row appears and the instructions show, without a reload
    - a duplicate shows the conflict message
    - revoking a trainer shows Revoked, and the club list's trainer count drops without a reload
    - a seeded expired invitation shows Expired

## 7. Trainer invitations page

- [x] 7.1 Build `/trainer/invitations` (design D7):
  - the email line from the server session
  - an unconfirmed-email message
  - the list with Accept and Decline (decline confirmed)
  - the accepted confirmation
  - "no longer available" with a refetch on `NOT_FOUND`/`BAD_REQUEST`
  - the separate-account message on `FORBIDDEN` only
  - an empty state suggesting the invited address

  Verify manually, end to end on local Supabase:
  - an admin invites a new email; that person signs in on the web, sees the invitation, accepts, and the admin's trainers table shows them as active "Invited as" that address
  - an athlete account signing in with an invited email gets the separate-account message and the invitation stays Pending
  - declining removes the invitation
  - revoking an invitation and then accepting it on the trainer page shows "no longer available"
  - with the invitation page open, an admin deactivates the club; accepting then shows "no longer available" (not the separate-account message) and the list refreshes
  - an admin account signing in with an invited email gets the separate-account message

## 8. Docs and handoff

- [x] 8.1 Write `apps/web/README.md` (auth flow, proxy, environment variables, how to run tests). Update `docs/project-architecture.md` with the web sign-in and proxy flow. The README marks `WEB_URL` as required and explains that it's the only trusted origin. Verify: every environment variable the README lists exists in `env.example` (no new ones), and the architecture doc names the proxy route and both API paths (browser proxy, server-only client).
- [x] 8.2 Add the web deviations to "Intentional handoff exceptions" in `docs/design-handoff/README.md`, with a CHANGELOG entry:
  - A1 replaced by the club list
  - no applications, documents, activity feed, permissions or search
  - invite modal with email only
  - "Suspended" renamed "Deactivated"
  - `/trainer/invitations` with no artboard
  - fixed widths replaced by a 1024 px minimum layout

  Verify: each unsupported surface named in `WEB-AUDIT.md` appears in the list.

## 9. Integration

- [x] 9.1 Run `turbo typecheck && turbo test && turbo lint`. Verify: all pass. List the changed files and the satisfied spec requirements in the handoff note, and record which manual checks from groups 3, 4, 5, 6 and 7 were run and their results. The root page and deactivated-club checks must be among them.

### Handoff note (2026-11-04)

**Automated checks:** `turbo typecheck` 19/19, `turbo lint` 10/10, `turbo test` all passing: API 414/414 (34 files), web 107/107 (14 files), api-client 7, auth 23, validators 111, shared-logic 71, crypto 29. `next build` succeeds. Browser bundles contain no `WEB_URL`, anon key, `access_token` or server API client strings.

The live Redis test (`queue-redis.int.test.ts`) only passes with the deployed Azure container app stopped: its BullMQ workers share the dev Upstash Redis and take the test's job. Nothing in this change caused it.

**Manual checks:** all checks in groups 3–7 were run by the owner, who reported them passing on 2026-11-04:
- Group 3: sign-in by link and by code; wrong code; no token in browser storage and `HttpOnly` cookies
- Group 4: the root page (`/` returns 200, and its link opens `/login`); a revoked refresh token sends the browser to `/login?next=…`
- Group 5: athlete and trainer see "not authorized"; admin sees the shell; no sideways scrolling at 1024 px
- Group 6: create, duplicate slug, empty filter, Load more; the deactivated-club checks (counts 1/1/1, Deactivated chip, closing the dialog changes nothing, reactivate copy, list updates without a reload); invite, duplicate invite, revoke trainer, Expired invitation, Invite disabled on a deactivated club
- Group 7: the six end-to-end trainer invitation flows

Before the owner's run, the agent checked the root page, the sessionless `/admin/clubs` redirect with a spoofed `Host`, the 403 for a proxy POST without `Origin`, and `private, no-store` on proxy responses.

**Satisfied spec requirements:**
- `web-portal-shell`: all 11 (Magic Link with code fallback; sessions unreadable by scripts; refresh keeps cookies; return paths stay on site; portal areas need sign-in; browser API calls go through the server; no caching; root leads to sign-in; admin area for admins only; loading, empty and error states; keyboard and desktop widths)
- `web-admin-club-management-view`: all 9
- `web-trainer-invitations-view`: all 3

**Changed files:**
- `apps/web`:
  - auth: `middleware.ts`, `app/login/`, `app/auth/`
  - proxy: `app/api/trpc/[trpc]/route.ts`
  - portals: `app/(admin)/`, `app/(trainer)/`
  - pages: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
  - `components/` (the shell and 20 components)
  - `lib/` (origins, `safe-next`, Supabase server client, auth flow, server API, session, log, format, mutations, tokens)
  - `test/`, Tailwind, PostCSS and Vitest config, `README.md`, `package.json`
  - removed: the `(auth)` and `(protected)` placeholders, `lib/get-token.ts`, `lib/supabase.ts`
- `packages/api-client`: the `./server` subpath (`server.ts`), `query-client.ts`, `errors.ts`, `provider.tsx`, `index.ts`, tests, `package.json`
- `packages/auth/package.json`: the `./server` subpath export
- Repo files: `turbo.json` (`WEB_URL`) and `yarn.lock`
- Docs:
  - `docs/project-architecture.md`
  - `docs/design-handoff/` (`tokens/colors.ts`, `README.md`, `CHANGELOG.md`)
  - this change's `proposal.md`, `design.md` and `tasks.md`

**Deviations:**
- The `@packages/auth/server` subpath (approved by the owner)
- `apps/web` pins `react` and `react-dom` to `19.2.0` to avoid duplicate React copies
- `NEXT_PUBLIC_API_URL` is listed in `apps/web/.env.example` but not in the root `env.example` (an existing variable)
- `WEB_URL` must be added to every environment
