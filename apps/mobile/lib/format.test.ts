import { describe, expect, it } from 'vitest';

import { formatDate, formatMetric, formatNumber } from './format';

const date = new Date(2026, 2, 7);

describe('mobile formatting', () => {
  it('formats dates in each language', () => {
    expect(formatDate('en', date, 'long')).toBe('March 7, 2026');
    expect(formatDate('es', date, 'long')).toBe('7 de marzo de 2026');
  });

  it('formats decimals with the locale separator', () => {
    expect(formatNumber('en', 4.615)).toBe('4.62');
    expect(formatNumber('es', 4.615)).toBe('4,62');
    expect(formatNumber('en', 12500)).toBe('12,500');
    expect(formatNumber('es', 12500)).toBe('12.500');
  });

  it('keeps the metric unit', () => {
    expect(formatMetric('es', 4.5, 'seconds')).toBe('4,5 seconds');
    expect(formatMetric('en', 82, '%')).toBe('82%');
    expect(formatMetric('en', 3, ' ')).toBe('3');
  });
});
