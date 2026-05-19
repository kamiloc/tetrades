/**
 * RLS tests — pii_consent_log table
 * Policy: NONE for authenticated role (service_role only access)
 *
 * With ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY and no matching
 * policy for the authenticated role, PostgreSQL denies all operations.
 *
 * Tested criteria:
 *   (a) authenticated SELECT returns 0 rows (effectively blocked)
 *   (b) authenticated INSERT is denied
 *   (c) authenticated UPDATE is denied
 *   (d) authenticated DELETE is denied
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('pii_consent_log RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let consentLogId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    user1 = await createTestUser(svc, sportId, 'pii-u1');

    // Insert a consent record via service_role so we can verify it is hidden
    consentLogId = randomUUID();
    await svc.from('pii_consent_log').insert({
      id: consentLogId,
      athlete_id: user1.athleteId,
      purpose_code: 'MEDICAL_DATA_UPLOAD',
      consent_version: 'v1.0',
      granted: true,
    });
  });

  afterAll(async () => {
    await cleanupTestUser(svc, user1);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT blocked ──────────────────────────────────────────────────────

  it('blocks authenticated SELECT on pii_consent_log (no policy)', async () => {
    const { data, error } = await user1.client
      .from('pii_consent_log')
      .select('id')
      .eq('id', consentLogId);

    // Either an error is returned or data is empty — no policy means no access
    const blocked = (error !== null) || (data !== null && data.length === 0);
    expect(blocked).toBe(true);
  });

  // ── (b) INSERT blocked ──────────────────────────────────────────────────────

  it('blocks authenticated INSERT on pii_consent_log', async () => {
    const { error } = await user1.client.from('pii_consent_log').insert({
      id: randomUUID(),
      athlete_id: user1.athleteId,
      purpose_code: 'MEDICAL_DATA_UPLOAD',
      consent_version: 'v1.0',
      granted: true,
    });

    expect(error).not.toBeNull();
  });

  // ── (c) UPDATE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated UPDATE on pii_consent_log', async () => {
    const { count } = await user1.client
      .from('pii_consent_log')
      .update({ granted: false }, { count: 'exact' })
      .eq('id', consentLogId);

    expect(count).toBe(0);
  });

  // ── (d) DELETE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated DELETE on pii_consent_log', async () => {
    const { count } = await user1.client
      .from('pii_consent_log')
      .delete({ count: 'exact' })
      .eq('id', consentLogId);

    expect(count).toBe(0);
  });
});
