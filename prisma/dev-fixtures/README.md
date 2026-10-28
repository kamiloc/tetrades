# Dev fixtures

Dev-only data for checking the mobile app on a device with your own signed-up athlete. Seed athletes can't sign in (placeholder Supabase ids), and the app has no trainer screens, so a real account otherwise has no clubs, metrics, connections, or certifications. Run `yarn db:seed` first. Never run these against production (they refuse when `NODE_ENV=production`).

Run them in this order, from the repo root. `--athlete <slug>` is optional when you are the only signed-up athlete; otherwise the script lists the candidates.

| # | Command | Creates |
| --- | --- | --- |
| 1 | `yarn db:fixture:clubs --athlete <slug>` | 2 ACTIVE memberships (Liga de Atletismo del Atlántico, Liga de Natación del Valle), 2 pending invitations, 1 COMPLETED, 1 REJECTED (never shown) |
| 2 | `yarn db:fixture:performance --athlete <slug>` | Trainer-reported entries at the primary club: 1, 4, 70 (last ~3 months), and 300 (daily) across four metrics, plus summaries |
| 3 | `yarn db:fixture:connections --athlete <slug>` | ACCEPTED ×3, PENDING ×2 (one incoming, one outgoing), DECLINED ×1 (the schema's "rejected" state); connection counts updated |
| 4 | `yarn db:fixture:achievements --athlete <slug>` | One achievement per certification state: UNVERIFIED, UNVERIFIED after a CANCELLED request, PENDING, VERIFIED, REJECTED with a reason |

All four are idempotent: rows that already exist are skipped and reported. `--replace` (performance and achievements only) deletes that fixture's own rows first; performance refuses when the athlete has metric entries the fixture didn't create. Memberships and connections are never deleted.

Safeguards: every fixture refuses to run when `NODE_ENV=production`, and when the database has no seed accounts (run `yarn db:seed` first; a production database never has them). `--athlete` accepts only a signed-up athlete, never a seed one.

Visibility settings are left untouched, so a fresh athlete still shows the defaults (achievements Public; clubs and metrics Private).
