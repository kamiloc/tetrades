// Shared plumbing for the dev-only fixtures in this folder. Every fixture
// targets one signed-up (non-seed) athlete, chosen by --athlete <slug> or, when
// there is exactly one, automatically. Never run against production.

import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const DAY_MS = 24 * 60 * 60 * 1000;

// Every fixture's club dates hang off this, so clubs → performance → achievements agree.
export const MEMBERSHIP_STARTED_DAYS_AGO = 330;

// The club the metrics come from (an ACTIVE membership from the clubs fixture).
export const PRIMARY_CLUB_SLUG = 'liga-atletismo-atlantico';

export interface FixtureArgs {
  athleteSlug: string | null;
  replace: boolean;
  // Any other --flag value pairs (e.g. --club <slug>).
  extra: ReadonlyMap<string, string>;
}

export function parseFixtureArgs(argv: readonly string[]): FixtureArgs {
  let athleteSlug: string | null = null;
  let replace = false;
  const extra = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--athlete') athleteSlug = argv[++i] ?? null;
    else if (arg === '--replace') replace = true;
    else if (arg !== undefined && arg.startsWith('--')) extra.set(arg.slice(2), argv[++i] ?? '');
    else throw new Error(`Unknown argument: ${String(arg)}`);
  }
  return { athleteSlug, replace, extra };
}

export interface FixtureAthlete {
  id: string;
  slug: string;
  displayName: string;
}

export async function resolveAthlete(slug: string | null): Promise<FixtureAthlete> {
  const select = { id: true, slug: true, displayName: true } as const;
  if (slug !== null) {
    const athlete = await prisma.athlete.findUnique({ where: { slug }, select });
    if (athlete === null) throw new Error(`No athlete with slug "${slug}".`);
    return athlete;
  }
  // Seed accounts use placeholder ids prefixed "seed-"; real sign-ups don't.
  const candidates = await prisma.athlete.findMany({
    where: { userAccount: { supabaseUserId: { not: { startsWith: 'seed-' } } } },
    select,
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const only = candidates[0];
  if (candidates.length === 1 && only) return only;
  if (candidates.length === 0) {
    throw new Error('No signed-up (non-seed) athlete found. Sign in and finish onboarding first.');
  }
  console.log('More than one signed-up athlete. Re-run with --athlete <slug>:');
  for (const c of candidates) console.log(`  ${c.slug}  (${c.displayName})`);
  throw new Error('Athlete is ambiguous.');
}

export function daysAgo(now: Date, days: number, hourUtc = 14): Date {
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc);
  return new Date(base - days * DAY_MS);
}

export function runFixture(name: string, main: () => Promise<void>): void {
  if (process.env['NODE_ENV'] === 'production') {
    console.error(`${name}: refusing to run in production.`);
    process.exitCode = 1;
    return;
  }
  main()
    .catch((error: unknown) => {
      console.error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
