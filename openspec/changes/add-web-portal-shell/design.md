# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **`apps/web`:**
  - Next 15 App Router with React 19.
  - `app/layout.tsx` wraps everything in `components/providers.tsx`, which mounts `ApiProvider` with `NEXT_PUBLIC_API_URL` and a `getToken` that reads the Supabase session in the browser (`lib/get-token.ts`, `lib/supabase.ts`).
  - `(protected)/layout.tsx` is a client-side guard. The `(auth)/login` page and the `(protected)` pages are 3-line placeholders.
  - There's no Tailwind, no middleware, no tests (`"test": "echo 'no tests yet'"`).
  - `next.config.js` transpiles `@packages/validators`, `shared-logic` and `auth`.
- **Auth and API packages:**
  - `@packages/auth` exports `createSsrServerClient({ supabaseUrl, supabaseAnonKey, cookies })`, a thin wrapper over `@supabase/ssr` `createServerClient` with `getAll`/`setAll` cookie methods.
  - `@packages/api-client` `ApiProvider({ apiUrl, getToken })` builds an `httpBatchLink` with `superjson`, adding `Authorization` only when `getToken()` returns a value.
- **The API.**
  - It verifies the bearer token on every request (`middleware/auth.ts`).
  - After `add-admin-club-trainer-management`, it exposes `admin.*` (including `whoAmI`) and `trainerInvitation.listMine | accept | decline`.
  - `trainerInvitation.*` reads `ctx.userEmail`, which is null unless Supabase confirmed the email.
- **Mobile tokens and styling.** Mobile uses Tailwind 3.4 through NativeWind. `apps/mobile/tailwind.config.js` builds color, radius and text classes from `apps/mobile/lib/tokens.js`, which mirrors `docs/design-handoff/tokens/`. Those tokens already include `ink`, `ink2`, `paper`, `canvas`, `onInk` and `blue`.
- **The web prototype** (`docs/design-handoff/web/`):
  - It defines the portal shell (`portal-shell.jsx`: `PSidebar`, `PTopBar`, `PTable`, `StatusChip`, `Field`/`Input`/`Select`, `Modal`, `Panel`, `Toolbar`), atoms (`atoms.jsx`: `Chip`, `Card`, `Avatar`, `ApMark`, …) and inline SVG icons (`icons.jsx`).
  - It uses CSS variables in `index.html`: `--ink-line`, `--on-ink-2/3`, `--paper-2`, `--line-2`, `--subtle`, `--blue-2`, `--blue-tint`, `--blue-line` and status colors. Some of these don't exist in the shared tokens yet.
  - It uses Inter and JetBrains Mono at fixed 1440×900 artboards.
  - `WEB-AUDIT.md` lists the surfaces with no backing API.

## Goals / Non-Goals

**Goals:**
- No token is ever readable by browser JavaScript, and all session handling follows the `@supabase/ssr` App Router pattern.
- One authenticated path to the API for client and server code, which `add-trainer-portal` and Change 9 reuse unchanged.
- A shell and component set faithful to the prototype within `WEB-AUDIT.md`.

**Non-Goals:**
- Server Components fetching tRPC data through `createCallerFactory` (AGENTS.md forbids importing `apps/api`; see D3).
- Public pages, SEO, ISR (Change 9).
- Layouts under 1024 px, dark theme, i18n.

## Decisions

### D1. Supabase auth runs only on the server
- **`lib/supabase-server.ts`** builds a client per request with `createSsrServerClient`, adapting Next's `cookies()` to `getAll`/`setAll`.
  - Every cookie it sets is forced to `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, and `secure: true` unless the request is to `localhost`.
  - Supabase's own cookie names and max-age are kept.
- **`/login`** is a Server Component with a form. Its server action `requestSignIn(email, next)` calls `signInWithOtp({ email, options: { emailRedirectTo: <origin>/auth/callback?next=…, shouldCreateUser: true } })`.
  - One email carries both the link and the code (the template keeps `{{ .Token }}`).
  - The page then shows the code-entry step.
  - The same message appears whether or not the email exists, so the form can't be used to probe accounts.
- **`verifyCode(email, code, next)`** (server action) calls `verifyOtp({ email, token, type: 'email' })`.
- **`/auth/callback`** (route handler) calls `exchangeCodeForSession(code)` (PKCE) and redirects to `next`.
- **Sign-out** is a server action calling `signOut()`, which clears the cookies.
- **Why `shouldCreateUser: true`:** an invited trainer may have no account yet. The invitation is the gate, not account creation. An athlete who signs in on the web just lands on a page that offers them nothing.
- **Where users land when there's no `next`:** admins go to `/admin/clubs`, everyone else to `/trainer/invitations`. The landing is chosen by calling `admin.whoAmI` server-side (D3) after sign-in. `add-trainer-portal` will change the non-admin default.
- *Alternative rejected:* the `@supabase/ssr` browser client. It needs script-readable cookies, which breaks AGENTS.md and the spec.

### D2. Middleware: refresh, guard and keep cookies
`middleware.ts` follows the Supabase Next.js SSR guide:
1. Create a server client whose `setAll` writes both to the incoming request's cookies and to a `NextResponse.next({ request })`.
2. Call `auth.getUser()`, which refreshes if needed.
3. For `/admin/:path*` and `/trainer/:path*` without a user, build a redirect to `/login?next=<pathname+search>` and **copy every cookie from the pending response onto the redirect** before returning it.

- The matcher excludes `_next/static`, `_next/image`, favicon and image files.
- It runs for `/api/trpc` too, so a refreshed session reaches the proxy, and the proxy writes the same cookies on its own response (D3).
- **`safeNext(value)`** (`lib/safe-next.ts`) accepts only strings starting with a single `/` that aren't `//`. It rejects backslashes, control characters, and any value that `new URL(value, origin)` resolves to another origin. Anything else becomes the default landing (D1). The login form, the callback and middleware all use it.

### D3. The tRPC proxy: one path for browser and server
**`app/api/trpc/[trpc]/route.ts`** exports `GET` and `POST`. For each request it:
1. On `POST`, rejects with 403 unless the `Origin` header equals the app's own origin. (A missing `Origin` on `POST` is also rejected. Browsers send it on cross-site and same-site fetches.)
2. Reads the session with the server client (`getSession()` after middleware has refreshed it) to get the access token.
3. Builds the upstream URL as `${API_ORIGIN}/trpc/${params.trpc}${request.nextUrl.search}`, so the path segment (comma-separated procedures in a batch) and the query string (`batch=1`, `input=…`) are kept exactly.
4. Forwards only `content-type`, `accept`, and `trpc-accept` if present, plus `authorization: Bearer <token>` when there's a session, and `x-request-id` for correlation. It never forwards `cookie`, `host`, or client `authorization`.
5. Streams the POST body through unchanged (`duplex: 'half'`), forwards the upstream status and body, and copies `content-type`. Any cookies the server client set during this request (a refresh) are applied to the outgoing response.
6. Never logs headers, the token or the body; it logs method, procedure path, status and request id.

- **`API_ORIGIN`** comes from the existing `NEXT_PUBLIC_API_URL`, with the `/trpc` suffix handled once in `lib/api-origin.ts`. That avoids adding a new environment variable.
- **The browser** mounts `ApiProvider apiUrl="/api/trpc" getToken={async () => null}`, so `@packages/api-client` is unchanged.
- **Server Components** call the API through a new React-free subpath export, `@packages/api-client/server`. It exports `createServerApiClient({ url, getToken })`, a vanilla `createTRPCClient<AppRouter>` with `httpLink` and `superjson`. That's client config, which the package contract allows; it uses only `@trpc/client` and `superjson`, which the package already depends on. `apps/web/lib/server-api.ts` creates one per request with the server session's token and calls the API origin directly (no hop through the proxy).
  - It's used only where a server-side decision is needed: the admin layout guard (`admin.whoAmI`) and the post-sign-in landing.
  - The invitations page reads the session email from the Supabase server client, not the API.
  - *Why a subpath:* the package index re-exports `ApiProvider` and the React hooks, and a Server Component must not pull those in.
  - *Alternative rejected:* importing `superjson` or `@trpc/client` in `apps/web`. That breaks the `@app/web` import contract.
- *Alternatives rejected:*
  - Forwarding only the body. That breaks GET queries and batches (review finding).
  - `createCallerFactory` (forbidden import).
  - Rewrites in `next.config.js`. They can't add the server-side bearer token.

### D4. Guarding the admin area
`app/(admin)/admin/layout.tsx` (Server Component) calls `admin.whoAmI` through `lib/server-api.ts` (D3):
- **`FORBIDDEN`:** render `components/not-authorized.tsx` with a sign-out action and no admin markup.
- **`UNAUTHORIZED`:** redirect to `/login?next=…`.
- **Success:** render the admin shell.

Every page under it still loads data through client hooks, and the API enforces the role on each call. The layout is presentation only. `/admin` redirects to `/admin/clubs`.

### D5. Styling: Tailwind 3.4 and one token source
- Install `tailwindcss@^3.4`, `postcss` and `autoprefixer` in `apps/web`. Add `postcss.config.js` and `app/globals.css` with the Tailwind layers and the CSS variables the shell needs.
- **`tailwind.config.ts`** reads the shared values the same way the mobile config does. It imports from `docs/design-handoff/tokens/` through a small `lib/tokens.ts` re-export, so web never hard-codes a handoff color.
- **Web-only values** used by the prototype that the shared tokens lack (`inkLine`, `inkLine2`, `onInk2`, `onInk3`, `paper2`, `line2`, `subtle`, `blue2`, `blueTint`, `blueLine`, status tints) are **added to `docs/design-handoff/tokens/colors.ts`**, where the handoff owns them. Mobile ignores keys it doesn't map.
- **Fonts:** Inter and JetBrains Mono through `next/font/google` (no new dependency; fonts are self-hosted at build).
- `<html lang>` stays `es` for the document root, and portal copy follows the handoff in English. Each portal layout sets `lang="en"` on its root element, so assistive technology reads the copy correctly.
- *Why not Tailwind 4:* it would mean a second Tailwind major in the repo while NativeWind 4 requires 3.

### D6. Components
Ported from the prototype into `apps/web/components/`, typed, styled with Tailwind classes, with no inline style objects:
- **Shell:** `PortalShell` (sidebar plus main), `Sidebar` (role label and tone, nav sections, user block with sign-out), `TopBar` (breadcrumbs plus an optional primary action), `PageBody`.
- **Data:** `Table` (semantic `<table>`, header row, empty slot), `StatusChip` (Active, Deactivated, Pending, Expired, Accepted, Declined, Revoked, Revoked trainer), `Panel`, `Toolbar`, `SegmentedFilter`.
- **Forms:** `Field`, `TextInput`, `Select` (a native `<select>` styled like the prototype), `Button` (primary, secondary, danger).
- **Feedback:** `Dialog` (native `<dialog>` with `showModal()`, which gives a focus trap and Escape; focus returns to the opener), `ConfirmDialog`, `LoadingState`, `EmptyState`, `ErrorState` (retry), `InlineAlert`.
- **Icons:** `Icon` with the subset of `icons.jsx` used (plus, chevron, more, users, building, mail, check, x, alert, log-out, copy) as inline SVG.
- **Brand:** `ApMark`.
- **Client or Server:** components that need state or events are Client Components (`'use client'`); the rest stay Server Components.
- **Focus ring:** one visible ring (`focus-visible:ring-2 ring-blue ring-offset-2`) on every interactive element.

### D7. Pages and data flow
**Admin** (`app/(admin)/admin/…`, Client Components inside the server-guarded layout, data through `@packages/api-client` hooks):
- **`clubs/page.tsx`:** `admin.listClubs` with the status filter and "Load more" (cursor). A create button opens `ClubFormDialog` (`admin.createClub`). `CONFLICT` maps to "That slug is already used". Zod field errors map to fields; the same `createClubInput` schema validates client-side before sending.
- **`clubs/[clubId]/page.tsx`:** `admin.getClub` plus an edit form (`admin.updateClub`, slug shown read-only), and Deactivate/Reactivate with `ConfirmDialog`. The deactivate result shows the counts from `deactivateClubOutput`. `NOT_FOUND` shows "Club not found" with a link back.
- **`clubs/[clubId]/trainers/page.tsx`:**
  - Two tables: `admin.listClubTrainers` ("Invited as <email>" or "Provisioned before invitations") and `admin.listClubTrainerInvitations` (the state chip from the derived `state`).
  - An invite dialog (`admin.inviteTrainer`). On success it shows `InviteInstructions`: "No email is sent. Ask <email> to sign in at <origin>/trainer/invitations using this exact address before <expiresAt>," with a Copy link button (`navigator.clipboard`, with a selectable fallback).
  - Revoke invitation and revoke trainer use `ConfirmDialog`.
  - When the club is deactivated, the invite button is disabled with an explanation.

**Trainer:**
- **`app/(trainer)/trainer/layout.tsx`:** the trainer shell (amber role tone, as in the prototype). Nav has one item, "Invitations"; `add-trainer-portal` adds the rest.
- **`invitations/page.tsx`:**
  - A Server Component reads the session user (email and `email_confirmed_at`) from the server client to show "Showing invitations for <email>", or the unconfirmed-email message.
  - A Client Component lists `trainerInvitation.listMine` with Accept and Decline (decline uses `ConfirmDialog`).
  - **Error mapping:** `FORBIDDEN` → the separate-account message; `NOT_FOUND` or `BAD_REQUEST` → "This invitation is no longer available", then refetch.

**Shared:**
- A client-side `onError` in the providers sends `UNAUTHORIZED` responses to `/login?next=<current path>`.
- Errors show user-facing copy only, never the raw message.

### D8. Removing the placeholders
Delete `app/(protected)/` (layout and four pages), `app/(auth)/` (replaced by `app/login` and `app/auth/callback`), `lib/get-token.ts` and `lib/supabase.ts` (the browser client). `app/page.tsx` stays as the placeholder landing for Change 9. No test files exist there.

### D9. Tests
- Add Vitest to `apps/web` (dependency approval) with `vitest.config.ts`, and change `"test"` to `vitest run`.
- **Unit tests:**
  - `safeNext` (relative OK; absolute, `//`, backslash and control characters rejected)
  - the cookie-option forcing in `lib/supabase-server.ts`
  - the proxy handler with a stubbed upstream `fetch`. It covers:
    - a single GET with `input` in the query
    - a batched GET (`a,b?batch=1&input=…`)
    - a single POST and a batched POST (body byte-identical)
    - no `authorization` without a session; `authorization` present with one
    - `cookie` never forwarded
    - a cross-origin POST and a missing-`Origin` POST → 403
    - refreshed cookies copied onto the response
  - the middleware redirect carries the refreshed cookies
  - `InviteInstructions` renders the exact address and the expiry
- **Manual end-to-end checks** (E2E automation is deferred to Sprint 7+ by AGENTS.md) are listed in tasks with their exact steps.

## Risks / Trade-offs

- **[The proxy is new, security-critical code]** → It's small, forwards an explicit header allow-list, never logs secrets, and has unit tests for each finding. The API still verifies every JWT.
- **[Server actions and the callback must share one cookie policy]** → One `lib/supabase-server.ts` factory forces the options, and it's unit-tested.
- **[`shouldCreateUser: true` lets anyone create an account by signing in on the web]** → That's already true on mobile. A web account without an invitation or admin role sees nothing and gets no access.
- **[Adding web-only colors to the shared token file]** → The keys are additive. Mobile maps only the keys it uses, and the handoff stays the single source.
- **[`NEXT_PUBLIC_API_URL` is used server-side by the proxy]** → It's not secret. A dedicated server-only variable would need an environment change; we can switch later without touching behavior.
- **[`lang` differs between the document root and the portal]** → Set per portal layout. Change 9 decides the public site's language.

## Migration Plan

1. Apply `add-admin-club-trainer-management` first (API routers and hooks).
2. Get approval for and install Tailwind, PostCSS, Autoprefixer and Vitest in `apps/web`.
3. The owner adds `http://localhost:3000/auth/callback` and the deployed origin's `/auth/callback` to Supabase Auth redirect URLs, and confirms the Magic Link template includes `{{ .Token }}`.
4. Deploy web after the API.

**Rollback:** redeploy the previous web build. The API is unaffected.

## Open Questions

- Copy wording on the admin and invitation pages can be refined during implementation without changing the specs.
