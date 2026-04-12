# ADR-001: Shared Code Boundaries and Monorepo Imports

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Keep UI app-specific and keep shared code inside `packages/*` only.

## Rules

- `packages/*` must never import from `apps/*`
- `apps/web` and `apps/mobile` must never import from each other
- shared imports use `@packages/*`
- `packages/*` stay platform-agnostic
- UI rendering code lives only inside apps
- no Solito or cross-platform UI bridge libraries

## Rationale

The product has distinct platform roles: SEO/public web and private mobile workflows. Shared UI would increase ambiguity for AI agents and blur platform boundaries.
