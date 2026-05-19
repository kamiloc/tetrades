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
 * not in the application (CLAUDE.md Auth Rules).
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

  await svc.from('data_lifecycle_requests').delete().eq('athlete_id', user.athleteId);
  await svc.from('pii_consent_log').delete().eq('athlete_id', user.athleteId);
  await svc.from('audit_log').delete().eq('athlete_id', user.athleteId);
  await svc
    .from('athlete_connections')
    .delete()
    .or(`requester_id.eq.${user.athleteId},addressee_id.eq.${user.athleteId}`);
  await svc.from('athlete_achievements').delete().eq('athlete_id', user.athleteId);
  // ocr_jobs.onDelete = Cascade from medical_documents, but we delete explicitly
  // to avoid relying on cascade ordering with service_role.
  await svc.from('ocr_jobs').delete().eq('athlete_id', user.athleteId);
  await svc.from('medical_documents').delete().eq('athlete_id', user.athleteId);
  await svc.from('athlete_public_profiles').delete().eq('athlete_id', user.athleteId);
  await svc.from('athlete_private_profiles').delete().eq('athlete_id', user.athleteId);
  await svc.from('profile_photo_assets').delete().eq('athlete_id', user.athleteId);
  await svc.from('athletes').delete().eq('id', user.athleteId);
  await svc.from('user_accounts').delete().eq('id', user.userAccountId);
  await svc.auth.admin.deleteUser(user.supabaseUserId);
}
