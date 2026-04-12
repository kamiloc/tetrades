# ADR-007: Auth and Session Handling

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

All auth flows go through `packages/auth` and all server authorization depends on verified JWT context.

## Rules

- do not call Supabase auth directly from apps
- trust only `ctx.userId`
- Magic Link is primary, OTP fallback
- no email/password auth
- Expo session storage uses `expo-secure-store`
- Next.js uses httpOnly cookie helpers
- never trust client-supplied user IDs
