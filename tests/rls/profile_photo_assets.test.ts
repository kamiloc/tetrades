/**
 * RLS tests — profile_photo_assets table
 * Policies:
 *   profile_photo_assets_select_own
 *   profile_photo_assets_insert_own
 *   profile_photo_assets_update_own
 *   profile_photo_assets_delete_own
 *
 * Tested criteria:
 *   (a) owner can SELECT their own photo asset rows
 *   (b) cross-tenant SELECT is denied
 *   (c) owner can INSERT their own photo asset
 *   (d) non-owner cannot INSERT photo asset for another athlete
 *   (e) owner can UPDATE their own photo asset
 *   (f) non-owner cannot UPDATE another athlete's photo asset
 *   (g) owner can DELETE their own photo asset
 *   (h) non-owner cannot DELETE another athlete's photo asset
 *
 * Note: object_path is L1-INTERNAL (includes the ORIGINAL variant's storage
 * path which could expose un-stripped EXIF data).  RLS keeps the row
 * owner-scoped so no cross-tenant reads occur even for L0 variants.
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

describe.skipIf(!envReady)('profile_photo_assets RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let photoUser2Id: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'photo-u1'),
      createTestUser(svc, sportId, 'photo-u2'),
    ]);

    // Photo asset for user2 — used in cross-tenant deny tests
    photoUser2Id = randomUUID();
    await svc.from('profile_photo_assets').insert({
      id: photoUser2Id,
      athlete_id: user2.athleteId,
      variant: 'THUMB_150',
      object_path: `profile-photos/${user2.athleteId}/thumb-150.webp`,
      width: 150,
      height: 150,
      processing_status: 'READY',
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own ──────────────────────────────────────────────────────────

  it('allows owner to SELECT their own photo asset rows', async () => {
    // Insert a photo for user1 first
    const myPhotoId = randomUUID();
    await svc.from('profile_photo_assets').insert({
      id: myPhotoId,
      athlete_id: user1.athleteId,
      variant: 'THUMB_150',
      object_path: `profile-photos/${user1.athleteId}/thumb-150.webp`,
      width: 150,
      height: 150,
      processing_status: 'QUEUED',
    });

    const { data, error } = await user1.client
      .from('profile_photo_assets')
      .select('id')
      .eq('id', myPhotoId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    await svc.from('profile_photo_assets').delete().eq('id', myPhotoId);
  });

  // ── (b) SELECT cross-tenant denied ─────────────────────────────────────────

  it('denies non-owner from SELECT on another athlete photo asset', async () => {
    const { data, error } = await user1.client
      .from('profile_photo_assets')
      .select('id')
      .eq('id', photoUser2Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (c) INSERT own ──────────────────────────────────────────────────────────

  it('allows owner to INSERT their own photo asset', async () => {
    const newId = randomUUID();
    const { error } = await user1.client.from('profile_photo_assets').insert({
      id: newId,
      athlete_id: user1.athleteId,
      variant: 'CARD_400',
      object_path: `profile-photos/${user1.athleteId}/card-400.webp`,
      width: 400,
      height: 400,
      processing_status: 'QUEUED',
    });

    expect(error).toBeNull();
    await svc.from('profile_photo_assets').delete().eq('id', newId);
  });

  // ── (d) INSERT cross-tenant denied ─────────────────────────────────────────

  it('denies user from INSERT photo asset for another athlete', async () => {
    const { error } = await user1.client.from('profile_photo_assets').insert({
      id: randomUUID(),
      athlete_id: user2.athleteId,
      variant: 'FULL_1200',
      object_path: `profile-photos/${user2.athleteId}/full-1200.webp`,
      width: 1200,
      height: 1200,
      processing_status: 'QUEUED',
    });

    expect(error).not.toBeNull();
  });

  // ── (e) UPDATE own ──────────────────────────────────────────────────────────

  it('allows owner to UPDATE their own photo asset', async () => {
    const updId = randomUUID();
    await svc.from('profile_photo_assets').insert({
      id: updId,
      athlete_id: user1.athleteId,
      variant: 'ORIGINAL',
      object_path: `profile-photos/${user1.athleteId}/original.jpg`,
      width: 3000,
      height: 3000,
      processing_status: 'QUEUED',
    });

    const { error } = await user1.client
      .from('profile_photo_assets')
      .update({ processing_status: 'READY' })
      .eq('id', updId);

    expect(error).toBeNull();
    await svc.from('profile_photo_assets').delete().eq('id', updId);
  });

  // ── (f) UPDATE cross-tenant denied ─────────────────────────────────────────

  it('denies non-owner from UPDATE on another athlete photo asset', async () => {
    const { count, error } = await user1.client
      .from('profile_photo_assets')
      .update({ processing_status: 'FAILED' }, { count: 'exact' })
      .eq('id', photoUser2Id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  // ── (g) DELETE own ──────────────────────────────────────────────────────────

  it('allows owner to DELETE their own photo asset', async () => {
    const delId = randomUUID();
    await svc.from('profile_photo_assets').insert({
      id: delId,
      athlete_id: user1.athleteId,
      variant: 'FULL_1200',
      object_path: `profile-photos/${user1.athleteId}/full-1200.webp`,
      width: 1200,
      height: 1200,
      processing_status: 'READY',
    });

    const { error } = await user1.client
      .from('profile_photo_assets')
      .delete()
      .eq('id', delId);

    expect(error).toBeNull();
  });

  // ── (h) DELETE cross-tenant denied ─────────────────────────────────────────

  it('denies non-owner from DELETE on another athlete photo asset', async () => {
    const { count, error } = await user1.client
      .from('profile_photo_assets')
      .delete({ count: 'exact' })
      .eq('id', photoUser2Id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
