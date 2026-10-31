# Proposal

## Why

`add-admin-club-trainer-management` gives admins and invited trainers an API, but nobody can use it: `apps/web` is placeholder pages with a client-side token check that doesn't meet the rule that sessions live in httpOnly cookies. This change builds the web base the admin console, the trainer portal (`add-trainer-portal`) and later the public profiles (Change 9) all need: sign-in, sessions, an authenticated path to the API, styling, and a shared shell. On that base it delivers the admin's club and trainer screens and the page where a trainer accepts an invitation.

## What Changes

- **Sign-in.** A `/login` page offers an email Magic Link with a one-time-code fallback. There's no password, Apple or Google sign-in. Every Supabase auth call runs on the Next.js server (server actions and an `/auth/callback` route), so the session lives only in httpOnly cookies and browser JavaScript never sees a token.
- **Session refresh and route protection.** `middleware.ts` refreshes the session on every request, keeping refreshed cookies on whatever response it returns, redirects included. It sends visitors without a session from `/admin/*` and `/trainer/*` to `/login?next=…`. `next` must be a same-origin relative path.
- **Two server-held API paths, one rule.** The session token never leaves the server.
  - **Browser calls** go through a same-origin proxy, `/api/trpc/[trpc]`. It adds `Authorization: Bearer <access token>` from the server-side session and forwards the original method, path, query string (GET queries and batches) and POST body unchanged. It never forwards browser cookies, rejects cross-origin POSTs, and marks every response `Cache-Control: private, no-store`.
  - **Server Components** call the API directly with the same session token through a small React-free client. It's used only for the admin guard and the post-sign-in landing.
- **Styling.** Tailwind CSS 3.4 (the same major as mobile's NativeWind) with the design-handoff tokens, including the portal's dark sidebar colors. Inter comes through `next/font`. The shared web components are ported from `docs/design-handoff/web/` into `apps/web/components/`.
- **Admin console (`/admin`).**
  - Only admins see it; everyone else gets a "not authorized" page. The API still enforces the role on every call.
  - Club list with an Active/Deactivated/All filter.
  - Club create and edit (slug read-only).
  - Deactivate and reactivate, with a confirmation that lists what gets cancelled.
  - A per-club trainers view: trainers labelled "Invited as <email>", invitations with their state, invite by email, and revoke confirmations.
  - After an invite, the page tells the admin what to pass on: sign in at the trainer invitations page with that exact email before the expiry date. No email is sent.
- **Trainer invitations page (`/trainer/invitations`).** A signed-in user sees the pending invitations for their confirmed email and accepts or declines each one. It explains why an athlete or admin account can't accept, and what an unconfirmed email means.
- **States and access.** Every page has loading, empty and error states, works by keyboard with a visible focus ring, and fits without horizontal scrolling from 1024 px up.
- **Removed:** the placeholder `(protected)` route group (`dashboard`, `profile`, `achievements`, `connections`), its client-side guard, and `lib/get-token.ts`. They were stubs from the earlier athlete-web idea; public athlete pages come in Change 9.
- **Root page.** `/` stops redirecting to the removed `/dashboard`. Until Change 9 it's a minimal placeholder with a link to sign in.
- **Expired sessions.** When the API answers unauthorized, the user is sent to sign-in with the current page as the return target.
- **Data stays current.** After each successful admin action (create, edit, deactivate, reactivate, invite, revoke), the affected lists and details refresh without a reload.
- **Handoff exceptions.** Every place the build intentionally differs from the web prototype is listed in `docs/design-handoff/README.md`.

### Out of scope

- The trainer portal's work screens (club picker, roster, athlete invites, certification inbox, metric entry), in `add-trainer-portal`. This change ships only the trainer shell and the invitations page.
- Public athlete pages, SEO, sitemap (Change 9). The root `/` page is only a placeholder.
- Layouts below 1024 px, dark theme, localization. Portal copy is English, as in the handoff.
- Prototype surfaces `WEB-AUDIT.md` marks unsupported (applications, documents, activity feed, permissions, search, exports).

## Capabilities

### New Capabilities
- `web-portal-shell`: web sign-in, cookie sessions, session refresh, route protection, the authenticated API path, the admin and trainer shells, and the baseline page states and keyboard access.
- `web-admin-club-management-view`: how an admin lists, creates, edits, deactivates and reactivates clubs, and manages a club's trainers and trainer invitations.
- `web-trainer-invitations-view`: how a signed-in user reviews and answers the trainer invitations sent to their email.

### Modified Capabilities
<!-- None. The behavior these pages call (admin, trainer invitations) is specified by add-admin-club-trainer-management and isn't changed here. -->

## Impact

- **Depends on** `add-admin-club-trainer-management`: the `admin` and `trainerInvitation` routers and the `@packages/api-client` hooks. This branch is stacked on it, and it must be applied first.
- **Code:** nearly all of `apps/web/`:
  - `app/`: login, auth callback, `(admin)`, `(trainer)`, the `api/trpc` proxy, the not-authorized page
  - `components/`, `lib/`
  - `middleware.ts`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`
  - root layout and fonts
- **Dependencies (need approval):** `tailwindcss@^3.4`, `postcss`, `autoprefixer` in `apps/web`. Vitest in `apps/web` for unit tests, if it isn't already reachable from the workspace.
- **Supabase configuration (needs confirmation):** add the web `/auth/callback` URLs (local and deployed) to Auth redirect URLs. The Magic Link email template must keep the `{{ .Token }}` code alongside the link.
- **`@packages/api-client`:**
  - A new React-free subpath export, `@packages/api-client/server` (`createServerApiClient`), so Server Components can call the API with the session token. It uses dependencies the package already has.
  - An optional, backward-compatible `onUnauthorized` callback on `ApiProvider`, so the web app can send an expired session to sign-in. Mobile doesn't pass it and is unchanged.
- **Canonical origin:** the existing `WEB_URL` variable (already in `env.example` for Magic Link redirects) becomes the single trusted origin for sign-in redirects, the CSRF check and invitation links. It's added to the `@app/web#build` env in `turbo.json`. No new variable is introduced.
- **Depends on a contract fix in `add-admin-club-trainer-management`:** `trainerInvitation.accept`/`decline` return `NOT_FOUND` when the club is no longer active, so `FORBIDDEN` means only "this account can't be a trainer".
- **No changes** to the API, schema, RLS or `@packages/validators`. `@packages/auth` is used through its existing SSR helper.
- **Design-handoff tokens:** `docs/design-handoff/tokens/colors.ts` gains the web-only shell colors the prototype uses (additive keys).
- **Docs:** `apps/web/README.md`, `docs/project-architecture.md` (web auth and proxy flow), `docs/design-handoff/README.md` and CHANGELOG (web exceptions).
