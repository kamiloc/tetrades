# @app/web

Next.js App Router app for the admin and trainer portals. Public athlete pages come later (Change 9); `/` is a placeholder with a link to sign in.

Architecture: `docs/project-architecture.md` ("Web sign-in and session", "Web API paths", "Web trainer portal"). Changes: `add-web-portal-shell`, `add-web-trainer-portal` (in `openspec/changes/` or its archive).

## Routes

| Route                                                  | What it is                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `/`                                                    | Placeholder, links to `/login`                                                     |
| `/login`                                               | Email step, then code step (Magic Link with a one-time code fallback)              |
| `/auth/callback`                                       | Magic Link landing: exchanges the PKCE code, redirects through `safeNext`          |
| `/admin` → `/admin/clubs`                              | Club list, create, filter, load more                                               |
| `/admin/clubs/[clubId]`                                | Club details, edit (slug read-only), deactivate and reactivate                     |
| `/admin/clubs/[clubId]/trainers`                       | Trainers, invitations, invite and revoke                                           |
| `/trainer`                                             | Trainer landing: the only club's roster, the picker for several, or a no-club note |
| `/trainer/clubs`                                       | Club picker                                                                        |
| `/trainer/invitations`                                 | The signed-in user's trainer invitations: accept or decline                        |
| `/trainer/clubs/[clubId]` → `…/athletes`               | Roster (active and own pending invitations), invite an athlete                     |
| `/trainer/clubs/[clubId]/athletes/[athleteId]`         | Athlete's metric summaries and entries, log a metric                               |
| `/trainer/clubs/[clubId]/certifications`               | Pending certification requests: approve, or reject with a reason                   |
| `/api/trpc/[trpc]`                                     | Same-origin tRPC proxy for browser calls                                           |

The admin layout shows the admin shell only when `admin.whoAmI` succeeds; anyone else sees "Not authorized". The API still checks the role on every call.

Trainer routes (`app/(trainer)/trainer/`): the root layout only checks the session. The `(home)` route group (`/trainer`, `/trainer/clubs`, `/trainer/invitations`) uses the generic trainer nav. `clubs/[clubId]/layout.tsx` is the club guard: it reads `club.listMyTrainerClubs` server-side and renders "You're not a trainer of this club" (and no page) for a club the user doesn't train, otherwise the club nav and the club switcher. A club page that later gets `FORBIDDEN` calls `router.refresh()`, so the guard runs again. Error-to-message mapping lives in `lib/trainer/errors.ts` (`trainerErrorNotice`).

## Auth flow

Every Supabase auth call runs on the server (`app/auth/actions.ts`, `app/auth/callback/route.ts`), so the session lives only in httpOnly cookies and browser JavaScript never sees a token.

1. `requestSignIn` sends one email with the link and the code. `emailRedirectTo` is `WEB_URL/auth/callback?next=…`. The message is the same whether or not the email has an account.
2. The user opens the link (`/auth/callback`) or types the code (`verifyCode`).
3. Cookies are written by `lib/supabase-server.ts`, which forces `httpOnly`, `SameSite=Lax`, `path=/`, and `Secure` everywhere except `localhost`.
4. The landing is a safe `next` (`lib/safe-next.ts`: same-origin relative paths only), else `/admin/clubs` for admins and `/trainer` for everyone else.

`middleware.ts` refreshes the session on every request and sends sessionless `/admin/*` and `/trainer/*` visits to `/login?next=…`, keeping refreshed cookies on redirects. When the API answers `UNAUTHORIZED` in the browser, `components/providers.tsx` sends the user to sign-in with the current page as `next`.

Server code imports `@packages/auth/server` and `@packages/api-client/server`, never the package indexes: those load React hooks that Server Components can't import.

## API paths

- **Browser:** hooks from `@packages/api-client` call `/api/trpc`. The proxy rejects a `POST` whose `Origin` isn't `WEB_URL`, adds the session's bearer token, forwards method, path, query and body unchanged, never forwards cookies, and marks every response `Cache-Control: private, no-store`.
- **Server:** `lib/server-api.ts` calls the API directly with the session token. Import it only from Server Components, server actions and route handlers, never from a `'use client'` module.

## Environment variables

| Variable                        | Required | Used for                                                                                   |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `WEB_URL`                       | **Yes**  | The only trusted origin, e.g. `http://localhost:3000` (see below)                          |
| `NEXT_PUBLIC_API_URL`           | Yes      | The API's tRPC endpoint, e.g. `http://localhost:3001/trpc` (used server-side by the proxy) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon key                                                                          |

`WEB_URL` must be set in every deployment. It's the single origin used for Magic Link redirects, middleware and callback redirects, return-path checks, the proxy's cross-site check, and the invitation link shown to admins. Request headers (`Host`, `X-Forwarded-Host`) are never trusted for any of these. It must be an origin only (scheme, host, optional port; no path). If it's missing or invalid, the server fails with a clear error instead of falling back to request headers.

Supabase Auth must list `WEB_URL/auth/callback` (local and deployed) in its redirect URLs, and the Magic Link email template must include `{{ .Token }}` so the code fallback works.

## Styling

Tailwind CSS 3.4 (`tailwind.config.ts`). Colors come from `docs/design-handoff/tokens/colors.ts` through `lib/tokens.ts`; never hard-code a handoff color. camelCase token keys become kebab-case classes (`onInk` → `text-on-ink`). Fonts are Inter and JetBrains Mono through `next/font`. Components live in `components/`; every interactive element uses the shared focus ring (`components/focus.ts`). Portal layouts set `lang="en"`.

## Tests

```bash
yarn turbo run test --filter=@app/web   # or: cd apps/web && npx vitest run
```

Vitest, Node environment by default; component tests opt into jsdom with `// @vitest-environment jsdom`. Supabase and the API are stubbed at the `fetch` level (`test/supabase-stub.ts`), and `next/headers` / `next/navigation` through `test/next-mocks.ts`. End-to-end checks are manual for now (E2E automation is deferred to Sprint 7+).
