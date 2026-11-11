# Tasks

## 1. Mobile locale foundation

- [x] 1.1 Confirm approval and Expo SDK compatibility before adding `expo-localization` if required; expose a typed app locale from the native device locale and verify English, Spanish variants, and unsupported-language fallback with locale resolver tests.
- [x] 1.2 Add app-local typed English and Spanish catalogs, interpolation/plural support, and a root translation provider; verify representative static, interpolated, and plural messages in both languages.
- [x] 1.3 Set mobile accessibility language metadata from the resolved locale and document the catalog/key conventions in `apps/mobile/components/README.md`; verify metadata behavior for Spanish and English fallback.

## 2. Web locale foundation

- [x] 2.1 Add an app-local typed English and Spanish catalog, locale normalization, interpolation/plural support, and provider; verify locale mapping and fallback with unit tests.
- [x] 2.2 Resolve locale from ordered `Accept-Language` preferences for each request and pass it consistently through Server and Client Components; verify Spanish, English, unsupported, and absent-header cases without a hydration mismatch.
- [x] 2.3 Set root document language from the resolved locale and remove fixed-English nested language metadata; verify rendered document metadata for both supported languages and fallback.

## 3. Mobile interface localization

- [x] 3.1 Localize authentication, onboarding, shared components, and shared feedback states, including accessibility labels; verify these screens in English and Spanish and check all referenced translation keys exist.
- [x] 3.2 Localize profile, achievements, visibility, search, connections, performance, and clubs screens, including dynamic counts and status labels; verify screen copy in both languages and catalog key completeness.
- [x] 3.3 Route mobile dates and numbers through locale-aware formatting helpers, including the existing `en-US` and one-off `es-CO` formatting; verify representative date and number output for both languages.

## 4. Web interface localization

- [x] 4.1 Localize sign-in, shared portal shell, dialogs, navigation, and common loading/error/empty/success states; verify English and Spanish rendering and catalog key completeness.
- [x] 4.2 Localize all admin club and trainer provisioning screens, including validation, confirmation, and status copy; verify user-visible states in both languages.
- [x] 4.3 Localize trainer invitations, roster, athlete metrics, and certification screens, including mapped API errors and dynamic values; verify user-visible states in both languages.
- [x] 4.4 Route web dates and numbers through locale-aware formatting helpers and remove fixed `en-US` formatting; verify representative output for English and Spanish.

## 5. Cross-app localization verification

- [x] 5.1 Audit every route and shared component in both apps for remaining user-visible hardcoded copy and missing translations; verify the audit finds no untranslated interface strings in either locale.
- [x] 5.2 Verify automatic selection, regional language normalization, English fallback, matching language metadata, and absence of a language switcher across both apps; record the results in the change review notes (`handoff.md`).
- [x] 5.3 Confirm API-generated push notification copy is unchanged and no locale preference is sent to or persisted by the API; verify by reviewing the frontend request changes and existing notification boundary.
