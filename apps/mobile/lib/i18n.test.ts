import { describe, expect, it } from 'vitest';

import { MESSAGE_KEYS, translate } from './translations';

const placeholders = (message: string): string[] => [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

describe('mobile translations', () => {
  it('returns static messages in either language', () => {
    expect(translate('en', 'common.tryAgain')).toBe('Try again');
    expect(translate('es', 'common.tryAgain')).toBe('Intentar de nuevo');
  });

  it('interpolates dynamic values', () => {
    expect(translate('es', 'clubs.activeCount', { count: 3 })).toBe('3 clubes activos');
    expect(translate('es', 'clubs.joined', { club: 'Club Atlético Nacional' })).toBe('Te uniste a Club Atlético Nacional');
  });

  it('selects singular and plural forms', () => {
    expect(translate('en', 'clubs.invitationCount', { count: 1 })).toBe('1 invitation');
    expect(translate('es', 'clubs.invitationCount', { count: 2 })).toBe('2 invitaciones');
    expect(translate('en', 'connections.athleteCount', { count: 1 })).toBe('1 athlete');
    expect(translate('es', 'connections.inNetwork', { count: 247 })).toBe('247 atletas en tu red');
  });

  it('formats number values for the locale', () => {
    expect(translate('en', 'connections.total', { count: 1250 })).toBe('1,250 total');
    expect(translate('es', 'connections.total', { count: 1250 })).toBe('1.250 en total');
    expect(translate('es', 'units.kg', { value: 70.5 })).toBe('70,5 kg');
  });

  it('localizes screen copy and status labels', () => {
    expect(translate('es', 'tabs.performance')).toBe('Rendimiento');
    expect(translate('es', 'status.PENDING')).toBe('Pendiente');
    expect(translate('es', 'visibility.default', { audience: translate('es', 'audience.PRIVATE') })).toBe('Predeterminado: Privado');
    expect(translate('en', 'achievements.empty.REJECTED')).toBe('No rejected achievements.');
  });

  it('gives every key a Spanish message with the same placeholders and plural shape', () => {
    for (const key of MESSAGE_KEYS) {
      for (const count of [1, 2]) {
        const english = translate('en', key, {});
        const spanish = translate('es', key, {});
        expect(spanish, key).not.toBe('');
        expect(placeholders(translate('es', key, { count })), key).toEqual(placeholders(translate('en', key, { count })));
        expect(placeholders(spanish), key).toEqual(placeholders(english));
      }
    }
  });
});
