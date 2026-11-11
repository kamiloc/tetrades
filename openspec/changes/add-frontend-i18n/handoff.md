# Handoff: add-frontend-i18n

Tasks 1.x–3.1 were implemented in an earlier session; 3.2–5.3 in this one (2026-11-11). Nothing outside `apps/web` and `apps/mobile` changed.

## Deviations from the artifacts

- **Mobile screen copy uses typed keys only.** The earlier session had started a `copy(englishSource)` helper backed by an untyped English→Spanish map; it was already missing a string ("Choose who can see what"). It is removed, and every screen uses `t('key')` against the typed catalog (design decision 1).
- **Display copy no longer comes from `@packages/shared-logic`.** `TAB_STATES`, the achievement and inactive-club chip labels, `connectionsSubtitle`, `clubsSubtitle`, `performanceSubtitle`, `AUDIENCE_LABELS`, `audienceDefaultLabel`, `METRIC_RANGE_LABELS` and `formatMetricValue` are English-only. Mobile now keeps only their logic (tones, icons, state selection, defaults) and translates in its own catalog. `shared-logic` itself is unchanged.
- **Catalog shape is enforced.** In both apps the Spanish catalog's type is derived from the English one, so a plural message must stay a plural. Number values passed to `t` are formatted for the locale.
- **Web rich text.** `rich(key, { email: <strong>…</strong> })` keeps emphasized values inside one translated sentence instead of splitting copy around JSX.
- **Web Server Components** use `getServerLocalization()` (`lib/server-i18n.ts`), which resolves the same `Accept-Language` locale as the root layout. Root and login metadata are now `generateMetadata`.
- **Web shared components became client components** (`portal-shell`, `not-authorized`, `states`, `status-chip`, `no-club`, `not-trainer-of-club`, `club-not-found`, `load-more`) so they can use the hook; tests render them with `renderToStaticMarkup`, which can't render nested async server components. Nav items, the portal role, the portal user subtitle and status chips take message keys. `ClubErrors` and `TRAINER_NOTICE_COPY` hold message keys.
- **`useWebLocalization()` defaults to English** when no provider is mounted (it used to throw). The root layout always provides the request locale; the default only applies to a component rendered alone, as in unit tests.
- **Spanish web dates follow `es-CO` conventions**: `dateStyle: 'medium'` renders `7/03/2026`.
- **The iOS date picker** now uses the app locale, so its calendar matches the interface language even when the device language is unsupported.
- **Onboarding**: removed an unused `NON_ATHLETE_ACCOUNT_ONBOARDING_MESSAGE` import left by the earlier session (lint error). Behavior is unchanged.

## Verification (tasks 5.1–5.3)

5.1 Audit of hardcoded copy
- Searched every `.tsx` in `apps/web/{app,components,lib}` and `apps/mobile/{app,components,lib}` for literal JSX text, string-valued `label`/`title`/`placeholder`/`aria-label`/`accessibilityLabel`/`hint`/`caption`/`header` props, and English string literals. Remaining hits are not interface copy: the `CO` country-code placeholder, server-message comparisons in mobile error mapping, and the API proxy's JSON error bodies.
- Catalog tests in both apps check that every key has a non-empty Spanish message with the same placeholders, in singular and plural.
- `apps/mobile/app.json` has no native permission or usage strings to localize.

5.2 Selection, normalization, fallback, metadata, no switcher
- Selection and normalization: `lib/locale-selection.test.ts` in both apps covers `es-CO`/`es-MX`/`es` → Spanish, `en-US` → English, ordered and `q`-weighted `Accept-Language`, unsupported → English, and an empty or absent header → English.
- Web metadata: `app/layout.test.tsx` renders `<html lang>` for Spanish, English, unsupported and absent headers. `lib/server-i18n.test.ts` shows server copy uses the same locale.
- Mobile metadata: the root view sets `accessibilityLanguage` from `accessibilityLanguageFor(locale)` (`es-CO` / `en-US`), covered in `lib/locale-selection.test.ts`.
- Spanish rendering: `components/localized-rendering.test.tsx` (web) renders the status chip, error state, access notice and invite instructions in Spanish.
- Formatting: `lib/format.test.ts` in both apps covers dates and numbers in both languages.
- No language switcher: neither app has a locale-setting control. Mobile's only `setLocale` re-reads the device locale when the app returns to the foreground. Web has no locale cookie or route.

5.3 API boundary
- No file under `apps/api`, `packages/`, `prisma/` or `supabase/` changed.
- The web tRPC proxy forwards only `content-type`, `accept` and `trpc-accept`, so `Accept-Language` never reaches the API. No procedure input gained a locale field.
- API push copy (`apps/api/src/__tests__/push-copy.test.ts`) is untouched.

## Checks run

- `apps/web`: `tsc`, `eslint`, `vitest run` (34 files, 207 tests), `next build`.
- `apps/mobile`: `tsc`, `eslint`, `vitest` on `lib/` (4 files), and `expo export` for Android and iOS (production bundles succeed).
- API and integration suites were not run (no API changes; they share the deployed DB and Redis).

## Follow-ups

- Mobile's `test` script is `echo 'no tests yet'`, so `turbo test` skips the mobile `lib/*.test.ts` suites. Running them there needs `vitest` declared as a mobile dev dependency (approval required).
- Profile edit parses weight with `parseFloat`, so a Spanish decimal comma (`70,5`) saves as `70`. This predates this change; the trainer metric dialog already accepts commas.
- Spanish strings are longer. Small phone widths, the sidebar and table headers were not checked on a device or in a browser.

## Changed files (this session)

Mobile (`apps/mobile`)
- `lib/translations.ts`, `lib/i18n.tsx`, `lib/format.ts` (new), `lib/format.test.ts` (new), `lib/i18n.test.ts`
- `app/(app)/_layout.tsx`, `app/(app)/(tabs)/_layout.tsx`, `app/(app)/(tabs)/profile.tsx`, `connections.tsx`, `performance.tsx`, `clubs.tsx`
- `app/(app)/achievements.tsx`, `profile-edit.tsx`, `visibility.tsx`, `search.tsx`, `onboarding.tsx` (import only)
- `components/StatusChip.tsx`, `AchievementRow.tsx`, `DateField.tsx`, `README.md`; import order in `OfflineBanner.tsx`, `ScreenHeader.tsx`, `Toast.tsx`

Web (`apps/web`)
- `lib/translations.ts`, `lib/i18n.tsx`, `lib/format.ts`, `lib/rich-text.tsx` (new), `lib/server-i18n.ts` (new), `lib/trainer/errors.ts`
- Tests: `lib/translations.test.ts`, `lib/format.test.ts` (new), `lib/rich-text.test.tsx` (new), `lib/server-i18n.test.ts` (new), `components/localized-rendering.test.tsx` (new), `lib/trainer/errors.test.ts`, `components/invite-instructions.test.tsx`
- `app/layout.tsx`, `app/page.tsx`, `app/login/page.tsx`, `app/login/login-form.tsx`
- `components/`: `portal-shell.tsx`, `sidebar-nav.tsx`, `not-authorized.tsx`, `states.tsx`, `confirm-dialog.tsx`, `dialog.tsx`, `status-chip.tsx`, `invite-instructions.tsx`
- `app/(admin)/admin/`: `layout.tsx`, `access-check-failed.tsx`, `clubs/clubs-view.tsx`, `clubs/club-form-dialog.tsx`, `clubs/club-fields.tsx`, `clubs/[clubId]/club-detail-view.tsx`, `clubs/[clubId]/club-not-found.tsx`, `clubs/[clubId]/trainers/trainers-view.tsx`, `clubs/[clubId]/trainers/invite-dialog.tsx`
- `app/(trainer)/trainer/`: `_components/*` (club switcher, load failed, load more, no club, not trainer of club, trainer shell), `(home)/page.tsx`, `(home)/clubs/page.tsx`, `(home)/invitations/page.tsx`, `(home)/invitations/invitations-list.tsx`, `clubs/[clubId]/layout.tsx`, `athletes/roster-view.tsx`, `athletes/invite-athlete-dialog.tsx`, `athletes/[athleteId]/athlete-view.tsx`, `athletes/[athleteId]/log-metric-dialog.tsx`, `certifications/certifications-view.tsx`
- `README.md` (Localization section)
