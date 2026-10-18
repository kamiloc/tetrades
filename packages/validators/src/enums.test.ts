import { describe, expect, it } from 'vitest';

import {
  certificationRequestStatusEnum,
  clubMembershipStatusEnum,
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
