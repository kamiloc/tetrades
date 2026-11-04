import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { localDay, measuredAtFor } from './measured-at';

// The API's MAX_FUTURE_SKEW_MS: a timestamp at most this far ahead is accepted.
const SKEW_MS = 5 * 60_000;
const notFuture = (value: Date, now: Date) => value.getTime() <= now.getTime() + SKEW_MS;

// Node applies a runtime change to process.env.TZ to later Date calls.
const ZONES = [
  { tz: 'Pacific/Kiritimati', offsetHours: 14 },
  { tz: 'America/Bogota', offsetHours: -5 },
];

describe.each(ZONES)('measuredAtFor in $tz', ({ tz, offsetHours }) => {
  let previous: string | undefined;
  beforeEach(() => {
    previous = process.env['TZ'];
    process.env['TZ'] = tz;
  });
  afterEach(() => {
    if (previous === undefined) delete process.env['TZ'];
    else process.env['TZ'] = previous;
  });

  it('runs in the intended zone', () => {
    expect(-new Date(2026, 10, 5, 12).getTimezoneOffset() / 60).toBe(offsetHours);
  });

  it('sends now for today just after local midnight', () => {
    const now = new Date(2026, 10, 5, 0, 5);
    const sent = measuredAtFor('2026-11-05', now);
    expect(sent?.getTime()).toBe(now.getTime());
    expect(sent && notFuture(sent, now)).toBe(true);
    expect(sent && localDay(sent)).toBe('2026-11-05');
  });

  it('sends now for today late in the evening', () => {
    const now = new Date(2026, 10, 5, 23, 50);
    const sent = measuredAtFor('2026-11-05', now);
    expect(sent?.getTime()).toBe(now.getTime());
    expect(sent && localDay(sent)).toBe('2026-11-05');
  });

  it("sends an earlier day's local noon, before now", () => {
    for (const now of [new Date(2026, 10, 5, 0, 5), new Date(2026, 10, 5, 23, 50)]) {
      const sent = measuredAtFor('2026-11-04', now);
      expect(sent?.getHours()).toBe(12);
      expect(sent && localDay(sent)).toBe('2026-11-04');
      expect(sent && sent.getTime() < now.getTime()).toBe(true);
    }
  });

  it('refuses tomorrow, and malformed or impossible dates', () => {
    const now = new Date(2026, 10, 5, 23, 50);
    expect(measuredAtFor('2026-11-06', now)).toBeNull();
    expect(measuredAtFor('2026-02-30', now)).toBeNull();
    expect(measuredAtFor('05/11/2026', now)).toBeNull();
    expect(measuredAtFor('', now)).toBeNull();
  });
});
