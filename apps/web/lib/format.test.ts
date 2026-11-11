import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatNumber } from './format';

const NOON_UTC = new Date('2026-03-07T12:00:00Z');

describe('web formatting', () => {
  it('formats dates in each language', () => {
    expect(formatDate('en', NOON_UTC)).toBe('Mar 7, 2026');
    // es-CO writes medium dates day-first and numeric.
    expect(formatDate('es', NOON_UTC)).toBe('7/03/2026');
  });

  it('formats date and time in each language', () => {
    expect(formatDateTime('en', NOON_UTC)).toMatch(/^Mar 7, 2026/);
    expect(formatDateTime('es', NOON_UTC)).toMatch(/^7\/03\/2026, /);
  });

  it('formats numbers with the locale separators', () => {
    expect(formatNumber('en', 11.4256, 3)).toBe('11.426');
    expect(formatNumber('es', 11.4256, 3)).toBe('11,426');
    expect(formatNumber('en', 12500)).toBe('12,500');
    expect(formatNumber('es', 12500)).toBe('12.500');
  });
});
