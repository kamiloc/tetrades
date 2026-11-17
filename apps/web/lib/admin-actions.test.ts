import { adminActionEnum } from '@packages/validators';
import { describe, expect, it } from 'vitest';

import { adminActionDetails, adminActionText, describeAdminAction } from './admin-actions';

const club = { id: 'clxclub0000000000000000001', name: 'Liga de Atletismo de Bogotá' };
const you = { isYou: true, email: null };
const other = { isYou: false, email: 'mariana.cardenas@ligas.co' };
const unknown = { isYou: false, email: null };

const EXPECTED = {
  CLUB_CREATED: 'created Liga de Atletismo de Bogotá',
  CLUB_UPDATED: 'edited Liga de Atletismo de Bogotá',
  CLUB_DEACTIVATED: 'deactivated Liga de Atletismo de Bogotá',
  CLUB_REACTIVATED: 'reactivated Liga de Atletismo de Bogotá',
  TRAINER_INVITED: 'invited a trainer to Liga de Atletismo de Bogotá',
  TRAINER_INVITATION_REVOKED: 'revoked a trainer invitation at Liga de Atletismo de Bogotá',
  TRAINER_REVOKED: 'revoked a trainer at Liga de Atletismo de Bogotá',
} as const;

describe('describeAdminAction', () => {
  it('covers all 7 actions', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...adminActionEnum.options].sort());
  });

  it.each(adminActionEnum.options)('%s with You, an email and An admin', (action) => {
    expect(adminActionText({ action, actor: you, club })).toBe(`You ${EXPECTED[action]}`);
    expect(adminActionText({ action, actor: other, club })).toBe(
      `mariana.cardenas@ligas.co ${EXPECTED[action]}`,
    );
    expect(adminActionText({ action, actor: unknown, club })).toBe(`An admin ${EXPECTED[action]}`);
  });

  it('splits out the club name so it can be linked', () => {
    expect(describeAdminAction({ action: 'TRAINER_INVITED', actor: you, club })).toEqual({
      before: 'You invited a trainer to ',
      club: club.name,
    });
  });

  it('says "a club" when the club is unknown', () => {
    expect(adminActionText({ action: 'CLUB_CREATED', actor: you, club: null })).toBe(
      'You created a club',
    );
  });
});

describe('adminActionDetails', () => {
  it('names the changed fields', () => {
    expect(adminActionDetails({ changedFields: ['name', 'city'] })).toEqual([
      'Changed: name, city',
    ]);
  });

  it('lists the cancelled counts', () => {
    expect(
      adminActionDetails({
        cancelledCertificationRequests: 1,
        rejectedMembershipInvitations: 1,
        revokedTrainerInvitations: 2,
      }),
    ).toEqual(['Cancelled: 1 certification request, 1 athlete invitation, 2 trainer invitations']);
  });

  it('is empty when nothing was recorded', () => {
    expect(adminActionDetails({})).toEqual([]);
  });
});
