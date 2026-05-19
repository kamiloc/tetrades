/**
 * RLS tests — medical_documents table
 * Policies: medical_documents_select_owner_or_verifier,
 *           medical_documents_insert_owner,
 *           medical_documents_update_owner_or_verifier,
 *           medical_documents_delete_owner
 *
 * Critical NULL-safety test:
 *   A document with verified_by_user_account_id = NULL must NOT be visible to
 *   any authenticated user other than the owner (the verifier branch in the
 *   SELECT policy is guarded by IS NOT NULL).
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

describe.skipIf(!envReady)('medical_documents RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;

  // IDs for service-role-created seed rows
  let docOwnedByUser1Id: string;
  let docOwnedByUser1WithVerifierId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'med-u1'),
      createTestUser(svc, sportId, 'med-u2'),
    ]);

    // doc with NULL verifier — only owner (user1) should see it
    docOwnedByUser1Id = randomUUID();
    await svc.from('medical_documents').insert({
      id: docOwnedByUser1Id,
      athlete_id: user1.athleteId,
      document_type_enc: PLACEHOLDER_BYTES,
      object_path_enc: PLACEHOLDER_BYTES,
      mime_type: 'application/pdf',
      sha256: 'aabbccdd',
      status: 'UPLOADED',
      verified_by_user_account_id: null,
    });

    // doc with user2 as the assigned verifier
    docOwnedByUser1WithVerifierId = randomUUID();
    await svc.from('medical_documents').insert({
      id: docOwnedByUser1WithVerifierId,
      athlete_id: user1.athleteId,
      document_type_enc: PLACEHOLDER_BYTES,
      object_path_enc: PLACEHOLDER_BYTES,
      mime_type: 'application/pdf',
      sha256: 'eeff0011',
      status: 'PENDING_REVIEW',
      verified_by_user_account_id: user2.userAccountId,
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── SELECT ──────────────────────────────────────────────────────────────────

  it('allows owner (user1) to SELECT own medical document', async () => {
    const { data, error } = await user1.client
      .from('medical_documents')
      .select('id')
      .eq('id', docOwnedByUser1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('denies non-owner (user2) from SELECT on owner document with NULL verifier', async () => {
    const { data, error } = await user2.client
      .from('medical_documents')
      .select('id')
      .eq('id', docOwnedByUser1Id);

    // NULL verifier branch must not make the row visible to everyone
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('allows assigned verifier (user2) to SELECT document they are assigned to', async () => {
    const { data, error } = await user2.client
      .from('medical_documents')
      .select('id')
      .eq('id', docOwnedByUser1WithVerifierId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── INSERT ──────────────────────────────────────────────────────────────────

  it('allows owner to INSERT their own medical document', async () => {
    const newId = randomUUID();
    const { error } = await user1.client.from('medical_documents').insert({
      id: newId,
      athlete_id: user1.athleteId,
      document_type_enc: PLACEHOLDER_BYTES,
      object_path_enc: PLACEHOLDER_BYTES,
      mime_type: 'application/pdf',
      sha256: '11223344',
      status: 'UPLOADED',
    });

    expect(error).toBeNull();

    // cleanup
    await svc.from('medical_documents').delete().eq('id', newId);
  });

  it('denies user from INSERT medical document for another athlete', async () => {
    const { error } = await user1.client.from('medical_documents').insert({
      id: randomUUID(),
      athlete_id: user2.athleteId,
      document_type_enc: PLACEHOLDER_BYTES,
      object_path_enc: PLACEHOLDER_BYTES,
      mime_type: 'application/pdf',
      sha256: 'deadbeef',
      status: 'UPLOADED',
    });

    expect(error).not.toBeNull();
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  it('allows owner to UPDATE their own medical document', async () => {
    const { error } = await user1.client
      .from('medical_documents')
      .update({ mime_type: 'image/jpeg' })
      .eq('id', docOwnedByUser1Id);

    expect(error).toBeNull();
  });

  it('denies non-owner / non-verifier from UPDATE on another athlete document', async () => {
    const { count, error } = await user2.client
      .from('medical_documents')
      .update({ mime_type: 'text/plain' }, { count: 'exact' })
      .eq('id', docOwnedByUser1Id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('allows assigned verifier to UPDATE the document they are assigned to', async () => {
    const { error } = await user2.client
      .from('medical_documents')
      .update({ status: 'VERIFIED' })
      .eq('id', docOwnedByUser1WithVerifierId);

    expect(error).toBeNull();
  });

  it('blocks verifier from re-parenting document to a different athlete (WITH CHECK)', async () => {
    // WITH CHECK only allows post-image athlete_id to match the caller's own athlete.
    // user2 is the verifier but their WITH CHECK will fail because athlete_id = user1.athleteId
    // and auth.uid() resolves to user2 (not the owner of user1.athleteId).
    const { count, error } = await user2.client
      .from('medical_documents')
      .update({ athlete_id: user2.athleteId }, { count: 'exact' })
      .eq('id', docOwnedByUser1WithVerifierId);

    expect(error).not.toBeNull();
    if (error === null) {
      // If no error, the update must have affected 0 rows
      expect(count).toBe(0);
    }
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('allows owner to DELETE their own medical document', async () => {
    const deleteId = randomUUID();
    await svc.from('medical_documents').insert({
      id: deleteId,
      athlete_id: user1.athleteId,
      document_type_enc: PLACEHOLDER_BYTES,
      object_path_enc: PLACEHOLDER_BYTES,
      mime_type: 'application/pdf',
      sha256: 'deleteme1',
      status: 'UPLOADED',
    });

    const { error } = await user1.client
      .from('medical_documents')
      .delete()
      .eq('id', deleteId);

    expect(error).toBeNull();
  });

  it('denies non-owner from DELETE on another athlete medical document', async () => {
    const { count, error } = await user2.client
      .from('medical_documents')
      .delete({ count: 'exact' })
      .eq('id', docOwnedByUser1Id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
