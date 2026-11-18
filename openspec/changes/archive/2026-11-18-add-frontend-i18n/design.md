# Design

## Context

The two apps are isolated leaves in the monorepo and cannot import UI or runtime code from each other. Web UI is rendered by Next.js App Router, including Server Components; mobile uses Expo Router and React Native. There is no existing localization library. Web portal layouts currently set English language metadata and format dates as `en-US`; mobile strings and several date/number formatters are hardcoded in English, with a one-off Spanish date field. See proposal.md and the spec deltas for scope and behavior.

## Goals / Non-Goals

**Goals:**
- Give each app an app-local translation catalog and typed translation/formatting access.
- Select the supported language from browser/device preferences on initial render without a user setting or persisted override.
- Keep server-rendered and client-rendered web content in the same language and expose matching language metadata.
- Cover all user-visible app copy, including accessible labels and dynamic, loading, and failure states.

**Non-Goals:**
- Localize API responses, emails, or API-generated push notification text.
- Add locale-prefixed routes, a language switcher, or a stored language preference.
- Share localization runtime or UI code across apps.

## Decisions

1. **Keep catalogs and runtime app-local.** Maintain separate typed English and Spanish catalogs in each frontend app. This follows the repository's app isolation rule and avoids a shared package importing app/UI concerns. Use stable message keys and interpolation/plural rules rather than inline conditional translations. Alternatives considered: a shared localization package (violates package boundaries) and duplicated ad-hoc ternaries (hard to audit for completeness).

2. **Normalize language preferences to English or Spanish.** Treat any supported tag whose primary language is `es` as Spanish, and `en` as English; choose the first supported browser/device preference and fall back to English if none match. Do not persist a locale because the app has no override and should follow current system/browser preferences. Alternatives considered: exact-region matching (would incorrectly reject common variants) and always using a regional Spanish locale (less faithful to the reported preference).

3. **Resolve web locale on the server from request language preferences.** Use the request's `Accept-Language` preferences for the initial server render, then pass the resolved locale through the app providers so client components use the same selection. Set the document `lang` from that resolved locale and remove nested fixed-English overrides. Do not introduce locale routes or cookies. This avoids a hydration mismatch and avoids relying on client-only `navigator.language` after rendering. A client-only locale switch after hydration was considered and rejected due to visible language flash and SSR mismatch.

4. **Read mobile locale from the native locale source at app startup.** Use Expo's supported device-locale API and provide the resolved language through the root app provider. `expo-localization` is not currently a direct dependency; if the implementation needs to add it, obtain the repository-required package approval first and verify compatibility with the installed Expo SDK. Do not infer locale from the device clock or date picker. A manually maintained native module bridge was rejected as unnecessary maintenance.

5. **Centralize app-local date and number formatting.** Formatting helpers take the resolved app locale and use locale-aware platform formatting. Route all user-visible date/number formatting through those helpers, including existing hardcoded `en-US` and `es-CO` call sites. Keep domain values, storage formats, and API payloads unchanged.

6. **Leave API-owned notification copy unchanged.** Translation catalogs cover only strings rendered inside the apps. No language preference is sent to or stored by the API.

## Risks / Trade-offs

- [Large existing string surface can leave untranslated copy] -> Inventory routes, shared components, accessibility strings, and server error mappings in both apps; require catalog coverage and exercise each screen in both locales.
- [Browser language negotiation can vary by request] -> Resolve once per web request and propagate the same locale through server and client providers; do not cache personalized locale output across users.
- [Native locale API may require an additional package] -> Check SDK compatibility and request package approval before modifying dependencies.
- [Spanish strings may expand layouts] -> Check small mobile widths, dialogs, tables, and action rows with translated copy.

## Migration Plan

1. Add locale normalization and app-local catalogs/runtime to each app.
2. Wire web request negotiation and native mobile locale selection into their respective roots.
3. Migrate all interface strings and formatters, then set matching language metadata.
4. Verify English, Spanish, and unsupported-language fallback in both apps; no persisted preference migration is needed.

Rollback consists of reverting the frontend change; it has no database or API migration.
