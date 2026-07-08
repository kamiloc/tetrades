/**
 * Shared fixtures for the task 3.9 integration suite.
 *
 * Real infrastructure only: a real Fastify server on an ephemeral port, the
 * API's own Prisma client against DATABASE_URL (overridden by
 * TEST_DATABASE_URL when set), and real Supabase auth users whose JWTs are
 * minted by Supabase itself (admin.createUser + signInWithPassword — the
 * same pattern as tests/rls/helpers/setup.ts). No HTTP, Prisma, router, or
 * context mocks anywhere.
 *
 * Two kinds of identities:
 *   - createAuthedUser: a real Supabase auth user with a valid JWT. Use for
 *     every caller of a protected procedure. Password auth is used ONLY in
 *     test infrastructure, never in the application (CLAUDE.md Auth Rules).
 *   - createFixtureAthlete: DB rows only (no auth user) for athletes that
 *     never call the API themselves — search results, connection targets.
 *
 * Isolation: every fixture carries a random marker in its unique fields and
 * is deleted by the owning test file. Nothing depends on rows created by
 * another file or another run.
 */
import './load-env.js';

import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import { expect } from 'vitest';

import { buildServer } from '../../../app.js';
import { setEnvForTests } from '../../../env.js';
import { prisma } from '../../../lib/prisma.js';
import type { AppRouter } from '../../../router/index.js';

export { authReady, dbReady } from './load-env.js';
export { prisma };

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

export interface RateLimitOverrides {
  public?: number;
  authenticated?: number;
  admin?: number;
  sensitive?: number;
}

/**
 * Boot the real API server (app.ts factory) on an ephemeral port. Rate-limit
 * tier maximums are env-driven, so overrides are applied by re-parsing env
 * before the build; each server captures its limits at registration time.
 * Non-rate-limit test groups pass high overrides so tier buckets can never
 * make unrelated tests flaky.
 */
export async function startServer(overrides: RateLimitOverrides = {}): Promise<TestServer> {
  setEnvForTests({
    ...process.env,
    ...(overrides.public !== undefined ? { RATE_LIMIT_PUBLIC: String(overrides.public) } : {}),
    ...(overrides.authenticated !== undefined
      ? { RATE_LIMIT_AUTHED: String(overrides.authenticated) }
      : {}),
    ...(overrides.admin !== undefined ? { RATE_LIMIT_ADMIN: String(overrides.admin) } : {}),
    ...(overrides.sensitive !== undefined
      ? { RATE_LIMIT_SENSITIVE: String(overrides.sensitive) }
      : {}),
  });

  const server = await buildServer({ logLevel: 'silent' });
  await server.listen({ port: 0, host: '127.0.0.1' });

  const address = server.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('startServer: could not determine ephemeral port');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => server.close(),
  };
}

// ---------------------------------------------------------------------------
// tRPC client — the same wire protocol the real apps use
// ---------------------------------------------------------------------------

export function apiClient(baseUrl: string, accessToken?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        transformer: superjson,
        headers:
          accessToken === undefined ? {} : { authorization: `Bearer ${accessToken}` },
      }),
    ],
  });
}

/** Await a client call and assert it rejects with the given tRPC error code. */
export async function expectTRPCCode(call: Promise<unknown>, code: string): Promise<void> {
  let thrown: unknown;
  try {
    await call;
  } catch (err: unknown) {
    thrown = err;
  }
  expect(thrown, `expected a TRPCClientError with code ${code}`).toBeInstanceOf(TRPCClientError);
  expect((thrown as TRPCClientError<AppRouter>).data?.code).toBe(code);
}

// ---------------------------------------------------------------------------
// Supabase clients (test infrastructure only)
// ---------------------------------------------------------------------------

function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function supabaseAnon(): SupabaseClient {
  return createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_ANON_KEY'] ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ---------------------------------------------------------------------------
// Sport fixture (Restrict FK target for every athlete)
// ---------------------------------------------------------------------------

export async function createTestSport(): Promise<string> {
  const sport = await prisma.sport.create({
    data: {
      name: `Int Test Sport ${randomUUID()}`,
      category: 'INDIVIDUAL',
      isActive: true,
    },
    select: { id: true },
  });
  return sport.id;
}

export async function deleteTestSport(sportId: string): Promise<void> {
  await prisma.sport.deleteMany({ where: { id: sportId } });
}

// ---------------------------------------------------------------------------
// Fixture athletes — DB rows only, never authenticate
// ---------------------------------------------------------------------------

export interface FixtureAthlete {
  athleteId: string;
  userAccountId: string;
  slug: string;
}

export interface FixtureAthleteOptions {
  displayName?: string;
  /** Defaults to false so fixtures never leak into searchAthletes tests. */
  isSearchable?: boolean;
}

export async function createFixtureAthlete(
  sportId: string,
  options: FixtureAthleteOptions = {},
): Promise<FixtureAthlete> {
  const marker = randomUUID().slice(0, 8);

  const userAccount = await prisma.userAccount.create({
    // supabaseUserId is a plain unique string (no FK to auth.users); fixture
    // athletes never authenticate, so a random UUID is sufficient.
    data: { supabaseUserId: randomUUID(), role: 'ATHLETE', status: 'ACTIVE' },
    select: { id: true },
  });

  const athlete = await prisma.athlete.create({
    data: {
      userAccountId: userAccount.id,
      slug: `int-fx-${marker}`,
      displayName: options.displayName ?? `Int Fixture ${marker}`,
      sportId,
      countryCode: 'CO',
      profileStatus: 'ACTIVE',
      privateProfile: { create: { encryptionKeyVersion: 'v1' } },
      publicProfile: { create: { isSearchable: options.isSearchable ?? false } },
    },
    select: { id: true, slug: true },
  });

  return { athleteId: athlete.id, userAccountId: userAccount.id, slug: athlete.slug };
}

export async function cleanupAthleteRows(athleteId: string): Promise<void> {
  await prisma.auditEvent.deleteMany({ where: { athleteId } });
  await prisma.athleteConnection.deleteMany({
    where: { OR: [{ requesterId: athleteId }, { addresseeId: athleteId }] },
  });
  await prisma.athleteAchievement.deleteMany({ where: { athleteId } });
  await prisma.athletePublicProfile.deleteMany({ where: { athleteId } });
  await prisma.athletePrivateProfile.deleteMany({ where: { athleteId } });
  await prisma.athlete.deleteMany({ where: { id: athleteId } });
}

export async function cleanupFixtureAthlete(fixture: FixtureAthlete): Promise<void> {
  await cleanupAthleteRows(fixture.athleteId);
  await prisma.userAccount.deleteMany({ where: { id: fixture.userAccountId } });
}

/** Bulk teardown for large fixture sets (search pagination seeds 25 athletes). */
export async function cleanupFixtureAthletes(fixtures: FixtureAthlete[]): Promise<void> {
  const athleteIds = fixtures.map((f) => f.athleteId);
  const userAccountIds = fixtures.map((f) => f.userAccountId);
  await prisma.auditEvent.deleteMany({ where: { athleteId: { in: athleteIds } } });
  await prisma.athleteConnection.deleteMany({
    where: {
      OR: [{ requesterId: { in: athleteIds } }, { addresseeId: { in: athleteIds } }],
    },
  });
  await prisma.athleteAchievement.deleteMany({ where: { athleteId: { in: athleteIds } } });
  await prisma.athletePublicProfile.deleteMany({ where: { athleteId: { in: athleteIds } } });
  await prisma.athletePrivateProfile.deleteMany({ where: { athleteId: { in: athleteIds } } });
  await prisma.athlete.deleteMany({ where: { id: { in: athleteIds } } });
  await prisma.userAccount.deleteMany({ where: { id: { in: userAccountIds } } });
}

// ---------------------------------------------------------------------------
// Authenticated users — real Supabase auth, real JWTs
// ---------------------------------------------------------------------------

export interface AuthedUser {
  supabaseUserId: string;
  userAccountId: string;
  /** null when created with withAthlete: false */
  athleteId: string | null;
  email: string;
  accessToken: string;
}

export interface AuthedUserOptions {
  /** Required when withAthlete is true (the default). */
  sportId?: string;
  role?: 'ATHLETE' | 'SYSTEM';
  withAthlete?: boolean;
  label?: string;
}

export async function createAuthedUser(options: AuthedUserOptions = {}): Promise<AuthedUser> {
  const marker = randomUUID().slice(0, 8);
  const label = options.label ?? 'user';
  const email = `int-${label}-${marker}@test.internal`;
  const password = randomUUID();

  const admin = supabaseAdmin();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr !== null || created.user === null) {
    throw new Error(`createAuthedUser(${label}): ${createErr?.message ?? 'null user'}`);
  }
  const supabaseUserId = created.user.id;

  const { data: session, error: signInErr } = await supabaseAnon().auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr !== null || session.session === null) {
    throw new Error(`createAuthedUser(${label}) signIn: ${signInErr?.message ?? 'no session'}`);
  }

  const userAccount = await prisma.userAccount.create({
    data: { supabaseUserId, role: options.role ?? 'ATHLETE', status: 'ACTIVE' },
    select: { id: true },
  });

  let athleteId: string | null = null;
  if (options.withAthlete !== false) {
    const sportId = options.sportId;
    if (sportId === undefined) {
      throw new Error(`createAuthedUser(${label}): sportId is required with an athlete`);
    }
    const athlete = await prisma.athlete.create({
      data: {
        userAccountId: userAccount.id,
        slug: `int-${label}-${marker}`,
        displayName: `Int ${label} ${marker}`,
        sportId,
        countryCode: 'CO',
        profileStatus: 'ACTIVE',
        privateProfile: { create: { encryptionKeyVersion: 'v1' } },
        publicProfile: { create: { isSearchable: false } },
      },
      select: { id: true },
    });
    athleteId = athlete.id;
  }

  return {
    supabaseUserId,
    userAccountId: userAccount.id,
    athleteId,
    email,
    accessToken: session.session.access_token,
  };
}

/**
 * Invalidate a user's JWT for the "expired token" auth-boundary test by
 * deleting the auth user behind it. Without the project's JWT signing secret
 * a literally-expired token cannot be minted, and waiting out the expiry is
 * not CI-viable; a deleted-user token exercises the identical API code path
 * (GoTrue rejects → verifyAuthToken → UNAUTHORIZED).
 */
export async function invalidateAuthUser(user: AuthedUser): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.supabaseUserId);
  if (error !== null) {
    throw new Error(`invalidateAuthUser: ${error.message}`);
  }
}

export async function cleanupAuthedUser(user: AuthedUser): Promise<void> {
  if (user.athleteId !== null) {
    await cleanupAthleteRows(user.athleteId);
  }
  await prisma.userAccount.deleteMany({ where: { supabaseUserId: user.supabaseUserId } });
  try {
    await supabaseAdmin().auth.admin.deleteUser(user.supabaseUserId);
  } catch {
    // Already deleted (invalidateAuthUser) or transient — never mask a test failure.
  }
}
