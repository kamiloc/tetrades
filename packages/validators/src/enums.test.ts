import { describe, expect, it } from 'vitest';

import {
  adminActionEnum,
  adminActionTargetTypeEnum,
  certificationRequestStatusEnum,
  clubMembershipStatusEnum,
  trainerInvitationStateEnum,
  trainerInvitationStatusEnum,
  userRoleEnum,
  visibilityAudienceEnum,
} from './enums.js';

describe('clubMembershipStatusEnum', () => {
  it('has exactly the four ADR-013 statuses', () => {
    expect(clubMembershipStatusEnum.options).toEqual([
      'PENDING_ATHLETE_CONFIRMATION',
      'ACTIVE',
      'COMPLETED',
      'REJECTED',
    ]);
  });

  it('rejects unknown statuses', () => {
    expect(clubMembershipStatusEnum.safeParse('PENDING').success).toBe(false);
  });
});

describe('visibilityAudienceEnum', () => {
  it('has exactly the three audiences', () => {
    expect(visibilityAudienceEnum.options).toEqual(['PRIVATE', 'CONNECTIONS', 'PUBLIC']);
  });

  it('rejects unknown audiences', () => {
    expect(visibilityAudienceEnum.safeParse('FRIENDS').success).toBe(false);
  });
});

describe('certificationRequestStatusEnum', () => {
  it('has exactly the four request statuses', () => {
    expect(certificationRequestStatusEnum.options).toEqual([
      'PENDING',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]);
  });

  it('rejects achievement verification statuses that are not request statuses', () => {
    expect(certificationRequestStatusEnum.safeParse('VERIFIED').success).toBe(false);
  });
});

describe('userRoleEnum', () => {
  it('has the athlete, system and admin roles', () => {
    expect(userRoleEnum.options).toEqual(['ATHLETE', 'SYSTEM', 'ADMIN']);
  });

  it('has no trainer role (trainer authority comes from ClubTrainer rows)', () => {
    expect(userRoleEnum.safeParse('TRAINER').success).toBe(false);
  });
});

describe('trainerInvitationStatusEnum', () => {
  it('has exactly the four stored statuses', () => {
    expect(trainerInvitationStatusEnum.options).toEqual([
      'PENDING',
      'ACCEPTED',
      'DECLINED',
      'REVOKED',
    ]);
  });

  it('never stores EXPIRED', () => {
    expect(trainerInvitationStatusEnum.safeParse('EXPIRED').success).toBe(false);
  });
});

describe('trainerInvitationStateEnum', () => {
  it('adds the derived EXPIRED state', () => {
    expect(trainerInvitationStateEnum.options).toEqual([
      'PENDING',
      'EXPIRED',
      'ACCEPTED',
      'DECLINED',
      'REVOKED',
    ]);
  });
});

describe('adminActionEnum', () => {
  it('has exactly the seven admin actions', () => {
    expect(adminActionEnum.options).toEqual([
      'CLUB_CREATED',
      'CLUB_UPDATED',
      'CLUB_DEACTIVATED',
      'CLUB_REACTIVATED',
      'TRAINER_INVITED',
      'TRAINER_INVITATION_REVOKED',
      'TRAINER_REVOKED',
    ]);
  });

  it('has the three target types', () => {
    expect(adminActionTargetTypeEnum.options).toEqual([
      'club',
      'club_trainer',
      'club_trainer_invitation',
    ]);
  });
});
