import { describe, expect, it } from 'vitest';

import { chartGeometry } from './chart-geometry.js';

describe('chartGeometry', () => {
  it('draws nothing for no points', () => {
    expect(chartGeometry([], 300, 116)).toEqual({ points: [], line: '', area: '' });
  });

  it('draws nothing before the chart has a size', () => {
    expect(chartGeometry([1, 2], 0, 116).points).toEqual([]);
  });

  it('centers a single point and draws no line', () => {
    const g = chartGeometry([4.61], 300, 116);
    expect(g.points).toEqual([{ x: 150, y: 58 }]);
    expect(g.line).toBe('');
    expect(g.area).toBe('');
  });

  it('spreads many points across the width, highest value at the top', () => {
    const g = chartGeometry([10, 20, 30], 300, 116);
    expect(g.points.map((p) => p.x)).toEqual([0, 150, 300]);
    expect(g.points[0]?.y).toBe(108);
    expect(g.points[2]?.y).toBe(8);
    expect(g.line).toBe('M0,108 L150,58 L300,8');
    expect(g.area).toBe('M0,108 L150,58 L300,8 L300,116 L0,116 Z');
  });

  it('draws identical values as a flat line mid-height', () => {
    const g = chartGeometry([5, 5, 5], 300, 116);
    expect(new Set(g.points.map((p) => p.y))).toEqual(new Set([58]));
  });

  it('ignores non-finite values', () => {
    expect(chartGeometry([Number.NaN, 3], 300, 116).points).toHaveLength(1);
  });
});
