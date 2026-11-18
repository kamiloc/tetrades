import { adminActionEnum } from '@packages/validators';
import { describe, expect, it } from 'vitest';

import {
  adminActionDetails,
  adminActionLabel,
  adminActionText,
  describeAdminAction,
} from './admin-actions';
import { translate } from './translations';

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
    expect(adminActionText('en', { action, actor: you, club })).toBe(`You ${EXPECTED[action]}`);
    expect(adminActionText('en', { action, actor: other, club })).toBe(
      `mariana.cardenas@ligas.co ${EXPECTED[action]}`,
    );
    expect(adminActionText('en', { action, actor: unknown, club })).toBe(
      `An admin ${EXPECTED[action]}`,
    );
  });

  it.each(adminActionEnum.options)('%s has a label and sentences in both languages', (action) => {
    for (const locale of ['en', 'es'] as const) {
      expect(translate(locale, adminActionLabel(action))).not.toBe('');
      expect(adminActionText(locale, { action, actor: you, club })).toContain(club.name);
      expect(adminActionText(locale, { action, actor: other, club })).toContain(other.email);
    }
  });

  it('conjugates the Spanish verb for the actor', () => {
    expect(adminActionText('es', { action: 'CLUB_CREATED', actor: you, club })).toBe(
      'Creaste Liga de Atletismo de Bogotá',
    );
    expect(adminActionText('es', { action: 'CLUB_CREATED', actor: unknown, club })).toBe(
      'Un administrador creó Liga de Atletismo de Bogotá',
    );
  });

  it('keeps the club name separate so it can be linked', () => {
    expect(describeAdminAction('en', { action: 'TRAINER_INVITED', actor: you, club })).toEqual({
      key: 'admin.activity.you.trainerInvited',
      actor: 'An admin',
      club: club.name,
    });
  });

  it('says "a club" when the club is unknown', () => {
    expect(adminActionText('en', { action: 'CLUB_CREATED', actor: you, club: null })).toBe(
      'You created a club',
    );
    expect(adminActionText('es', { action: 'CLUB_CREATED', actor: you, club: null })).toBe(
      'Creaste un club',
    );
  });
});

describe('adminActionDetails', () => {
  it('names the changed fields', () => {
    expect(adminActionDetails('en', { changedFields: ['name', 'city'] })).toEqual([
      'Changed: name, city',
    ]);
    expect(adminActionDetails('es', { changedFields: ['name', 'countryCode'] })).toEqual([
      'Cambios: nombre, país',
    ]);
  });

  it('lists the cancelled counts with plural forms', () => {
    const details = {
      cancelledCertificationRequests: 1,
      rejectedMembershipInvitations: 1,
      revokedTrainerInvitations: 2,
    };
    expect(adminActionDetails('en', details)).toEqual([
      'Cancelled: 1 certification request, 1 athlete invitation, 2 trainer invitations',
    ]);
    expect(adminActionDetails('es', details)).toEqual([
      'Cancelaciones: 1 solicitud de certificación, 1 invitación de atleta, 2 invitaciones de entrenadores',
    ]);
  });

  it('is empty when nothing was recorded', () => {
    expect(adminActionDetails('en', {})).toEqual([]);
  });
});
