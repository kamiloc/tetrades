import { describe, expect, it } from 'vitest';

import { MESSAGE_KEYS, translate } from './translations';

const placeholders = (message: string): string[] =>
  [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

describe('web translations', () => {
  it('returns static messages in English and Spanish', () => {
    expect(translate('en', 'common.tryAgain')).toBe('Try again');
    expect(translate('es', 'common.tryAgain')).toBe('Intentar de nuevo');
    expect(translate('es', 'portal.trainer')).toBe('Portal de entrenadores');
  });

  it('interpolates values and selects plural forms', () => {
    expect(translate('es', 'clubs.activeCount', { count: 3 })).toBe('3 clubes activos');
    expect(translate('en', 'clubs.invitationCount', { count: 1 })).toBe('1 invitation');
    expect(translate('es', 'clubs.invitationCount', { count: 2 })).toBe('2 invitaciones');
    expect(translate('en', 'admin.club.activeTrainers', { count: 1 })).toBe('1 active trainer');
    expect(translate('es', 'admin.club.activeTrainers', { count: 4 })).toBe('4 entrenadores activos');
  });

  it('formats number values for the locale', () => {
    expect(translate('en', 'admin.club.cancelledRequests', { count: 1200 })).toBe(
      '1,200 pending certification requests',
    );
    expect(translate('es', 'admin.club.cancelledRequests', { count: 1200 })).toBe(
      '1.200 solicitudes de certificación pendientes',
    );
  });

  it('gives every key a Spanish message with the same placeholders', () => {
    for (const key of MESSAGE_KEYS) {
      for (const count of [1, 2]) {
        const english = translate('en', key, { count });
        const spanish = translate('es', key, { count });
        expect(spanish, key).not.toBe('');
        expect(placeholders(spanish), key).toEqual(placeholders(english));
      }
    }
  });
});
