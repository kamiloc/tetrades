# ADR-011: Web/Mobile Runtime Decisions

- **Status:** Accepted
- **Date:** 2026-04-02

## Web decisions

- Next.js App Router only
- public athlete pages are Server Components with ISR `revalidate: 3600`
- use `generateMetadata()` for SEO, OG, Twitter, JSON-LD, and canonical URLs
- do not self-call the API over HTTP from Server Components

## Mobile decisions

- use `expo-router` only
- do not install `react-navigation` directly
- use NativeWind for new styling
- use `expo-image-picker` and `expo-notifications`
- keep token storage in secure storage
