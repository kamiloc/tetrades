/**
 * RLS tests — ocr_jobs table
 * Policy: ocr_jobs_select_owner_direct  (SELECT only — direct athlete_id predicate, ADR-008)
 * No INSERT / UPDATE / DELETE for authenticated role.
 *
 * Tested criteria:
 *   (a) owning athlete can SELECT their own OCR job rows
 *   (b) cross-tenant SELECT is denied (another athlete cannot see the job)
 *   (c) authenticated INSERT is blocked (service_role / worker only)
 *   (d) authenticated UPDATE is blocked
 *   (e) authenticated DELETE is blocked
 *
 * ADR-008 note: The policy uses ocr_jobs.athlete_id directly (denormalized
 * column) without a join to medical_documents.  This avoids the join-based
 * RLS risk flagged in the ADR.
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
  PLACEHOLDER_BYTES,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('ocr_jobs RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let medDocId: string;
  let ocrJobId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'ocr-u1'),
      createTestUser(svc, sportId, 'ocr-u2'),
    ]);

    // medical_document owned by user1
    medDocId = randomUUID();
    await svc.from('medical_documents').insert({
      id: medDocId,
      athlete_id: user1.athleteId,
      document_type_enc: PLACEHOLDER_BYTES,
      object_path_enc: PLACEHOLDER_BYTES,
      mime_type: 'application/pdf',
      sha256: 'ocr-test-sha',
      status: 'PROCESSING',
    });

    // OCR job for user1's document (denormalized athlete_id per ADR-008)
    ocrJobId = randomUUID();
    await svc.from('ocr_jobs').insert({
      id: ocrJobId,
      medical_document_id: medDocId,
      athlete_id: user1.athleteId,
      model_name: 'claude-sonnet-4-20250514',
      prompt_version: 'v1',
      status: 'QUEUED',
      request_id: randomUUID(),
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own ──────────────────────────────────────────────────────────

  it('allows owning athlete to SELECT their own OCR job', async () => {
    const { data, error } = await user1.client
      .from('ocr_jobs')
      .select('id, athlete_id')
      .eq('id', ocrJobId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.athlete_id).toBe(user1.athleteId);
  });

  // ── (b) SELECT cross-tenant denied ─────────────────────────────────────────

  it('denies another athlete from SELECT on ocr_jobs (cross-tenant)', async () => {
    const { data, error } = await user2.client
      .from('ocr_jobs')
      .select('id')
      .eq('id', ocrJobId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (c) INSERT blocked ──────────────────────────────────────────────────────

  it('blocks authenticated INSERT on ocr_jobs (worker-only table)', async () => {
    const { error } = await user1.client.from('ocr_jobs').insert({
      id: randomUUID(),
      medical_document_id: medDocId,
      athlete_id: user1.athleteId,
      model_name: 'claude-sonnet-4-20250514',
      prompt_version: 'v1',
      status: 'QUEUED',
      request_id: randomUUID(),
    });

    expect(error).not.toBeNull();
  });

  // ── (d) UPDATE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated UPDATE on ocr_jobs', async () => {
    const { count } = await user1.client
      .from('ocr_jobs')
      .update({ status: 'SUCCEEDED' }, { count: 'exact' })
      .eq('id', ocrJobId);

    expect(count).toBe(0);
  });

  // ── (e) DELETE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated DELETE on ocr_jobs', async () => {
    const { count } = await user1.client
      .from('ocr_jobs')
      .delete({ count: 'exact' })
      .eq('id', ocrJobId);

    expect(count).toBe(0);
  });
});
