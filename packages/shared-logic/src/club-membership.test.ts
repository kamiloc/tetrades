import { describe, expect, it } from 'vitest';

import {
  CLUB_MEMBERSHIP_STATUSES,
  OPEN_CLUB_MEMBERSHIP_STATUSES,
  canTransitionClubMembership,
  clubMembershipGrantsTrainerAccess,
  type ClubMembershipStatusValue,
} from './club-membership.js';

const ALLOWED: ReadonlyArray<readonly [ClubMembershipStatusValue, ClubMembershipStatusValue]> = [
  ['PENDING_ATHLETE_CONFIRMATION', 'ACTIVE'],
  ['PENDING_ATHLETE_CONFIRMATION', 'REJECTED'],
  ['ACTIVE', 'COMPLETED'],
];

const isAllowed = (from: ClubMembershipStatusValue, to: ClubMembershipStatusValue): boolean =>
  ALLOWED.some(([f, t]) => f === from && t === to);

describe('club membership transitions', () => {
  for (const from of CLUB_MEMBERSHIP_STATUSES) {
    for (const to of CLUB_MEMBERSHIP_STATUSES) {
      const expected = isAllowed(from, to);
      it(`${from} → ${to} is ${expected ? 'allowed' : 'denied'}`, () => {
        expect(canTransitionClubMembership(from, to)).toBe(expected);
      });
    }
  }

  it('COMPLETED and REJECTED are terminal', () => {
    for (const to of CLUB_MEMBERSHIP_STATUSES) {
      expect(canTransitionClubMembership('COMPLETED', to)).toBe(false);
      expect(canTransitionClubMembership('REJECTED', to)).toBe(false);
    }
  });
});

describe('trainer access', () => {
  it('is granted only by ACTIVE', () => {
    const granting = CLUB_MEMBERSHIP_STATUSES.filter(clubMembershipGrantsTrainerAccess);
    expect(granting).toEqual(['ACTIVE']);
  });
});

describe('open memberships', () => {
  it('are PENDING_ATHLETE_CONFIRMATION and ACTIVE only', () => {
    expect([...OPEN_CLUB_MEMBERSHIP_STATUSES].sort()).toEqual(
      ['ACTIVE', 'PENDING_ATHLETE_CONFIRMATION'],
    );
  });
});
