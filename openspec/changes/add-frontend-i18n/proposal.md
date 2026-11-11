# Proposal

## Why

The web and mobile apps currently present mostly English interfaces despite serving athletes and clubs in Spanish-speaking regions, and their language behavior is inconsistent. Supporting English and Spanish based on the browser or device language makes the experience accessible without asking users to configure a preference.

## What Changes

- Add automatic language selection for interface text in `apps/web` and `apps/mobile`, supporting English and Spanish.
- Use the browser/device language with English fallback for unsupported languages; do not add an in-app language switcher or persisted language preference.
- Localize displayed interface dates and numbers alongside text.
- Keep API-generated push notification content out of scope.

## Capabilities

### New Capabilities

- `frontend-localization`: Automatic locale selection, supported languages, fallback behavior, and translated interface content across the web and mobile apps.

### Modified Capabilities

- `web-portal-shell`: Portal language and copy requirements must allow localized English and Spanish behavior.
- `mobile-app-shell`: App copy requirements must allow localized English and Spanish behavior.

## Impact

- Affected applications: `apps/web` (Next.js App Router) and `apps/mobile` (Expo Router / React Native).
- Affected app shell, sign-in, admin, trainer, athlete screens, shared app-local formatting helpers, and relevant UI tests.
- The web currently sets English in portal layouts and formats dates as `en-US`; mobile hardcodes English copy and has a one-off `es-CO` date field.
- Mobile currently has no direct locale-detection dependency. Any package addition will require approval under repository dependency rules.
- No API, database, push-notification, or shared UI package changes are in scope.
