import { describe, expect, it } from 'vitest';

import { trainerInvitationState } from './trainer-invitation.js';

const expiresAt = new Date('2026-11-14T12:00:00.000Z');

describe('trainerInvitationState', () => {
  it('is PENDING before the expiry', () => {
    expect(trainerInvitationState('PENDING', expiresAt, new Date('2026-11-14T11:59:59.999Z'))).toBe(
      'PENDING',
    );
  });

  it('is EXPIRED exactly at the expiry', () => {
    expect(trainerInvitationState('PENDING', expiresAt, expiresAt)).toBe('EXPIRED');
  });

  it('is EXPIRED after the expiry', () => {
    expect(trainerInvitationState('PENDING', expiresAt, new Date('2026-12-01T00:00:00.000Z'))).toBe(
      'EXPIRED',
    );
  });

  it.each(['ACCEPTED', 'DECLINED', 'REVOKED'] as const)(
    'returns terminal status %s unchanged, before and after the expiry',
    (status) => {
      expect(trainerInvitationState(status, expiresAt, new Date('2026-11-01T00:00:00.000Z'))).toBe(
        status,
      );
      expect(trainerInvitationState(status, expiresAt, new Date('2026-12-01T00:00:00.000Z'))).toBe(
        status,
      );
    },
  );
});
