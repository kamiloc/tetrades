/**
 * Shared fixture factory for RLS integration tests.
 *
 * Each test file calls createTestSport() + createTestUser() in beforeAll and
 * the matching cleanup helpers in afterAll.  The service-role client bypasses
 * RLS for setup/teardown; user clients exercise the policies under test.
 *
 * Bytea placeholder: PostgREST (used by supabase-js) encodes/decodes bytea as
 * base64 in the JSON layer.  PLACEHOLDER_BYTES is the base64 of the UTF-8
 * string "rls-test-placeholder" and is safe to use for encrypted-field stubs
 * in tests where the content is irrelevant to the RLS outcome.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? '';
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

export const envReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SERVICE_ROLE_KEY);

export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getUserClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Base64 of "rls-test-placeholder" — used as a stub for bytea (Bytes) columns.
export const PLACEHOLDER_BYTES = Buffer.from('rls-test-placeholder').toString('base64');

export interface TestUser {
  supabaseUserId: string;
  userAccountId: string;
  athleteId: string;
  email: string;
  accessToken: string;
  client: SupabaseClient;
}

export async function createTestSport(svc: SupabaseClient): Promise<string> {
  const id = randomUUID();
  const { error } = await svc.from('sports').insert({
    id,
    name: `RLS Test Sport ${id}`,
    category: 'INDIVIDUAL',
    is_active: true,
  });
  if (error) throw new Error(`createTestSport: ${error.message}`);
  return id;
}

export async function deleteTestSport(svc: SupabaseClient, sportId: string): Promise<void> {
  await svc.from('sports').delete().eq('id', sportId);
}

/**
 * Creates a full test user stack:
 *   Supabase Auth user → user_accounts row → athletes row → signed-in JWT
 *
 * Uses password auth (email_confirm: true) so tests can sign in immediately
 * without magic-link flow.  Password auth is used ONLY in test infrastructure,
 * not in the application (AGENTS.md Auth Rules).
 */
export async function createTestUser(
  svc: SupabaseClient,
  sportId: string,
  label: string,
): Promise<TestUser> {
  const uid = randomUUID().slice(0, 8);
  const email = `rls-${label}-${uid}@test.internal`;
  const password = randomUUID();

  const { data: authData, error: authErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr !== null || authData.user === null) {
    throw new Error(`createTestUser[auth](${label}): ${authErr?.message ?? 'null user'}`);
  }
  const supabaseUserId = authData.user.id;

  const userAccountId = randomUUID();
  const { error: uaErr } = await svc.from('user_accounts').insert({
    updated_at: new Date().toISOString(),
    id: userAccountId,
    supabase_user_id: supabaseUserId,
    role: 'ATHLETE',
    status: 'ACTIVE',
  });
  if (uaErr !== null) {
    throw new Error(`createTestUser[user_accounts](${label}): ${uaErr.message}`);
  }

  const athleteId = randomUUID();
  const { error: athErr } = await svc.from('athletes').insert({
    updated_at: new Date().toISOString(),
    id: athleteId,
    user_account_id: userAccountId,
    slug: `rls-${label}-${uid}`,
    display_name: `RLS ${label} ${uid}`,
    sport_id: sportId,
    country_code: 'CO',
    profile_status: 'ACTIVE',
    is_under_legal_hold: false,
  });
  if (athErr !== null) {
    throw new Error(`createTestUser[athletes](${label}): ${athErr.message}`);
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sessionData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr !== null || sessionData.session === null) {
    throw new Error(`createTestUser[signIn](${label}): ${signInErr?.message ?? 'null session'}`);
  }

  return {
    supabaseUserId,
    userAccountId,
    athleteId,
    email,
    accessToken: sessionData.session.access_token,
    client: getUserClient(sessionData.session.access_token),
  };
}

/**
 * Removes all test data for a user in reverse FK dependency order.
 * Errors are suppressed so cleanup never hides test failures.
 */
export async function cleanupTestUser(svc: SupabaseClient, user: TestUser): Promise<void> {
  // Nullify avatar reference before deleting photo assets (Restrict FK)
  await svc
    .from('athlete_public_profiles')
    .update({ avatar_asset_id: null })
    .eq('athlete_id', user.athleteId);

  await svc.from('athlete_metric_entries').delete().eq('athlete_id', user.athleteId);
  await svc.from('athlete_metric_summaries').delete().eq('athlete_id', user.athleteId);
  await svc.from('athlete_visibility_settings').delete().eq('athlete_id', user.athleteId);
  await svc.from('club_memberships').delete().eq('athlete_id', user.athleteId);
  await svc.from('club_trainers').delete().eq('user_account_id', user.userAccountId);
  await svc.from('device_tokens').delete().eq('user_account_id', user.userAccountId);
  await svc.from('data_lifecycle_requests').delete().eq('athlete_id', user.athleteId);
  await svc.from('pii_consent_log').delete().eq('athlete_id', user.athleteId);
  await svc.from('audit_log').delete().eq('athlete_id', user.athleteId);
  await svc
    .from('athlete_connections')
    .delete()
    .or(`requester_id.eq.${user.athleteId},addressee_id.eq.${user.athleteId}`);
  await svc.from('athlete_achievements').delete().eq('athlete_id', user.athleteId);
  await svc.from('athlete_public_profiles').delete().eq('athlete_id', user.athleteId);
  await svc.from('athlete_private_profiles').delete().eq('athlete_id', user.athleteId);
  await svc.from('profile_photo_assets').delete().eq('athlete_id', user.athleteId);
  await svc.from('athletes').delete().eq('id', user.athleteId);
  await svc.from('user_accounts').delete().eq('id', user.userAccountId);
  await svc.auth.admin.deleteUser(user.supabaseUserId);
}

// ── Clubs, trainers, memberships, metrics (ADR-013) ─────────────────────────

export type MembershipStatus = 'PENDING_ATHLETE_CONFIRMATION' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';

export async function createTestClub(svc: SupabaseClient, label: string): Promise<string> {
  const id = randomUUID();
  const { error } = await svc.from('clubs').insert({
    id,
    slug: `rls-club-${label}-${id.slice(0, 8)}`,
    name: `RLS Club ${label}`,
    country_code: 'CO',
    city: 'Medellín',
  });
  if (error) throw new Error(`createTestClub(${label}): ${error.message}`);
  return id;
}

/** Makes `user` a trainer of `clubId`; returns the club_trainers.id. */
export async function addClubTrainer(
  svc: SupabaseClient,
  clubId: string,
  user: TestUser,
): Promise<string> {
  const id = randomUUID();
  const { error } = await svc
    .from('club_trainers')
    .insert({ id, club_id: clubId, user_account_id: user.userAccountId });
  if (error) throw new Error(`addClubTrainer: ${error.message}`);
  return id;
}

/**
 * Creates a membership and walks it through legal transitions to `status`
 * (the transition trigger only accepts PENDING_ATHLETE_CONFIRMATION on insert).
 */
export async function createTestMembership(
  svc: SupabaseClient,
  args: { clubId: string; athleteId: string; clubTrainerId: string; status: MembershipStatus },
): Promise<string> {
  const id = randomUUID();
  const { error } = await svc.from('club_memberships').insert({
    id,
    club_id: args.clubId,
    athlete_id: args.athleteId,
    invited_by_club_trainer_id: args.clubTrainerId,
    status: 'PENDING_ATHLETE_CONFIRMATION',
  });
  if (error) throw new Error(`createTestMembership[insert]: ${error.message}`);

  const path: Record<MembershipStatus, MembershipStatus[]> = {
    PENDING_ATHLETE_CONFIRMATION: [],
    ACTIVE: ['ACTIVE'],
    COMPLETED: ['ACTIVE', 'COMPLETED'],
    REJECTED: ['REJECTED'],
  };
  for (const next of path[args.status]) {
    const { error: upErr } = await svc
      .from('club_memberships')
      .update({ status: next })
      .eq('id', id);
    if (upErr) throw new Error(`createTestMembership[${next}]: ${upErr.message}`);
  }
  return id;
}

export async function createTestMetricDefinition(svc: SupabaseClient): Promise<string> {
  const id = randomUUID();
  const { error } = await svc.from('metric_definitions').insert({
    id,
    key: `rls_metric_${id.slice(0, 8)}`,
    name: 'RLS Sprint 100 m',
    unit: 's',
    is_active: true,
  });
  if (error) throw new Error(`createTestMetricDefinition: ${error.message}`);
  return id;
}

export async function deleteTestMetricDefinition(svc: SupabaseClient, id: string): Promise<void> {
  await svc.from('athlete_metric_entries').delete().eq('metric_definition_id', id);
  await svc.from('athlete_metric_summaries').delete().eq('metric_definition_id', id);
  await svc.from('metric_definitions').delete().eq('id', id);
}

/** Removes a club and everything hanging off it, in FK order. */
export async function cleanupTestClub(svc: SupabaseClient, clubId: string): Promise<void> {
  const { data } = await svc.from('club_memberships').select('id').eq('club_id', clubId);
  const membershipIds = (data ?? []).map((r: { id: string }) => r.id);
  if (membershipIds.length > 0) {
    await svc.from('athlete_metric_entries').delete().in('club_membership_id', membershipIds);
  }
  await svc.from('club_memberships').delete().eq('club_id', clubId);
  await svc.from('club_trainers').delete().eq('club_id', clubId);
  await svc.from('clubs').delete().eq('id', clubId);
}
