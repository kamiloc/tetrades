import { describe, expect, it } from 'vitest';

import { authErrorMessage } from './auth-errors';

describe('mobile auth error messages', () => {
  it('uses the requested language for known and fallback errors', () => {
    expect(authErrorMessage('Too many requests', 'en')).toBe('Too many attempts. Wait a moment and try again.');
    expect(authErrorMessage('Too many requests', 'es')).toBe('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
    expect(authErrorMessage('unexpected', 'es')).toBe('No pudimos iniciar sesión. Intenta de nuevo.');
  });
});
