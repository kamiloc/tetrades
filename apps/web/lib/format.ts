// Portal copy is English (handoff), so dates use en-US formatting.
const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const DATE_TIME = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value: Date): string {
  return DATE.format(value);
}

export function formatDateTime(value: Date): string {
  return DATE_TIME.format(value);
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
