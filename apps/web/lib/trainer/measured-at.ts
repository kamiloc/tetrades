// The measured date to the `measuredAt` timestamp (design D4). The API rejects
// a timestamp more than 5 minutes ahead, so today is sent as the moment of
// saving and an earlier day as that day's local noon (before now, since
// today's local midnight has passed). A later day is refused before sending.

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A date as `YYYY-MM-DD` in the local time zone (the `<input type="date">` format). */
export function localDay(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** null when the day is malformed, not a real date, or after today. */
export function measuredAtFor(day: string, now: Date): Date | null {
  const match = DAY.exec(day);
  if (match === null) return null;
  const today = localDay(now);
  if (day === today) return new Date(now.getTime());
  if (day > today) return null;
  const noon = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return localDay(noon) === day ? noon : null;
}
