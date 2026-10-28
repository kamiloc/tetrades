// Presentation helpers for trainer-reported metrics (ADR-013). Read-only:
// summaries come from the server, never computed here.

export const METRIC_RANGES = ['1M', '3M', '6M', 'ALL'] as const;

export type MetricRange = (typeof METRIC_RANGES)[number];

export const METRIC_RANGE_LABELS: Readonly<Record<MetricRange, string>> = {
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  ALL: 'All',
};

// Page size for entry requests (server max is 50).
export const METRIC_ENTRY_PAGE_SIZE = 50;

// The all-time range has no start date, so paging stops here.
export const ALL_TIME_ENTRY_CAP = 200;

const MONTHS: Readonly<Record<Exclude<MetricRange, 'ALL'>, number>> = {
  '1M': 1,
  '3M': 3,
  '6M': 6,
};

// Start of the range, or null for all time.
export function rangeStart(range: MetricRange, now: Date): Date | null {
  if (range === 'ALL') return null;
  const start = new Date(now.getTime());
  start.setMonth(start.getMonth() - MONTHS[range]);
  return start;
}

export interface MeasuredEntry {
  measuredAt: Date;
}

// Entries inside the range (start inclusive), oldest first for charting.
export function filterEntriesByRange<T extends MeasuredEntry>(
  entries: readonly T[],
  range: MetricRange,
  now: Date,
): T[] {
  const start = rangeStart(range, now);
  return entries
    .filter((entry) => start === null || entry.measuredAt.getTime() >= start.getTime())
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
}

export interface NeedsMoreEntriesInput {
  // measuredAt of the oldest entry loaded so far; null when nothing is loaded.
  oldestMeasuredAt: Date | null;
  // null for the all-time range.
  rangeStart: Date | null;
  loadedCount: number;
  hasNextPage: boolean;
  cap?: number;
}

// Entries arrive newest first. Keep paging while the loaded entries don't yet
// reach back to the range start; for all time, stop at the cap.
export function needsMoreEntries({
  oldestMeasuredAt,
  rangeStart: start,
  loadedCount,
  hasNextPage,
  cap = ALL_TIME_ENTRY_CAP,
}: NeedsMoreEntriesInput): boolean {
  if (!hasNextPage) return false;
  if (start === null) return loadedCount < cap;
  if (oldestMeasuredAt === null) return true;
  return oldestMeasuredAt.getTime() >= start.getTime();
}

// True when the all-time chart stopped at the cap with more entries available.
export function isEntryListTruncated(
  range: MetricRange,
  loadedCount: number,
  hasNextPage: boolean,
  cap = ALL_TIME_ENTRY_CAP,
): boolean {
  return range === 'ALL' && hasNextPage && loadedCount >= cap;
}

// "4.61 seconds", "28 inches", "82%". At most two decimals, no trailing zeros.
export function formatMetricValue(value: number, unit: string): string {
  const number = String(Math.round(value * 100) / 100);
  const trimmedUnit = unit.trim();
  if (trimmedUnit === '') return number;
  return trimmedUnit === '%' ? `${number}%` : `${number} ${trimmedUnit}`;
}
