import { describe, expect, it } from 'vitest';

import {
  ALL_TIME_ENTRY_CAP,
  filterEntriesByRange,
  formatMetricValue,
  isEntryListTruncated,
  needsMoreEntries,
  rangeStart,
} from './metrics-view.js';

const NOW = new Date('2026-10-18T12:00:00Z');
const entry = (iso: string): { measuredAt: Date } => ({ measuredAt: new Date(iso) });

describe('rangeStart', () => {
  it('is null for all time', () => {
    expect(rangeStart('ALL', NOW)).toBeNull();
  });

  it('goes back whole months', () => {
    expect(rangeStart('3M', NOW)?.toISOString()).toBe('2026-07-18T12:00:00.000Z');
  });

  it('clamps to the last day of a shorter target month', () => {
    const endOfMarch = new Date(2026, 2, 31, 12);
    const oneMonth = rangeStart('1M', endOfMarch);
    expect([oneMonth?.getFullYear(), oneMonth?.getMonth(), oneMonth?.getDate()]).toEqual([2026, 1, 28]);
    const threeMonths = rangeStart('3M', new Date(2026, 4, 31, 12));
    expect([threeMonths?.getMonth(), threeMonths?.getDate()]).toEqual([1, 28]);
  });

  it('clamps into a leap-year February and crosses the year boundary', () => {
    const leap = rangeStart('1M', new Date(2028, 2, 30, 12));
    expect([leap?.getMonth(), leap?.getDate()]).toEqual([1, 29]);
    const lastYear = rangeStart('6M', new Date(2026, 1, 15, 12));
    expect([lastYear?.getFullYear(), lastYear?.getMonth(), lastYear?.getDate()]).toEqual([2025, 7, 15]);
  });

  it('keeps the time of day', () => {
    const start = rangeStart('1M', new Date(2026, 2, 31, 9, 30));
    expect([start?.getHours(), start?.getMinutes()]).toEqual([9, 30]);
  });
});

describe('filterEntriesByRange', () => {
  it('returns nothing for no entries', () => {
    expect(filterEntriesByRange([], '1M', NOW)).toEqual([]);
  });

  it('keeps the start boundary and sorts oldest first', () => {
    const start = rangeStart('1M', NOW);
    const onBoundary = { measuredAt: start ?? NOW };
    const result = filterEntriesByRange(
      [entry('2026-10-10T00:00:00Z'), onBoundary, entry('2026-08-01T00:00:00Z')],
      '1M',
      NOW,
    );
    expect(result).toEqual([onBoundary, entry('2026-10-10T00:00:00Z')]);
  });

  it('keeps everything for all time', () => {
    expect(filterEntriesByRange([entry('2001-01-01T00:00:00Z')], 'ALL', NOW)).toHaveLength(1);
  });
});

describe('needsMoreEntries', () => {
  const start = new Date('2026-07-18T12:00:00Z');

  it('stops when there is no next page', () => {
    expect(
      needsMoreEntries({ oldestMeasuredAt: null, rangeStart: start, loadedCount: 0, hasNextPage: false }),
    ).toBe(false);
  });

  it('stops when the first page already reaches before the range start', () => {
    expect(
      needsMoreEntries({
        oldestMeasuredAt: new Date('2026-06-01T00:00:00Z'),
        rangeStart: start,
        loadedCount: 50,
        hasNextPage: true,
      }),
    ).toBe(false);
  });

  it('continues while the oldest entry is still inside the range', () => {
    expect(
      needsMoreEntries({
        oldestMeasuredAt: new Date('2026-08-01T00:00:00Z'),
        rangeStart: start,
        loadedCount: 50,
        hasNextPage: true,
      }),
    ).toBe(true);
  });

  it('stops all-time paging at the cap', () => {
    expect(
      needsMoreEntries({ oldestMeasuredAt: NOW, rangeStart: null, loadedCount: 150, hasNextPage: true }),
    ).toBe(true);
    expect(
      needsMoreEntries({
        oldestMeasuredAt: NOW,
        rangeStart: null,
        loadedCount: ALL_TIME_ENTRY_CAP,
        hasNextPage: true,
      }),
    ).toBe(false);
  });
});

describe('isEntryListTruncated', () => {
  it('is true only for a capped all-time list with more pages', () => {
    expect(isEntryListTruncated('ALL', ALL_TIME_ENTRY_CAP, true)).toBe(true);
    expect(isEntryListTruncated('ALL', ALL_TIME_ENTRY_CAP, false)).toBe(false);
    expect(isEntryListTruncated('3M', ALL_TIME_ENTRY_CAP, true)).toBe(false);
  });
});

describe('formatMetricValue', () => {
  it('formats with the unit and at most two decimals', () => {
    expect(formatMetricValue(4.61, 'seconds')).toBe('4.61 seconds');
    expect(formatMetricValue(28, 'inches')).toBe('28 inches');
    expect(formatMetricValue(4.6149, 's')).toBe('4.61 s');
    expect(formatMetricValue(82, '%')).toBe('82%');
  });
});
