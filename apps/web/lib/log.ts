// Minimal structured logger for web server code (route handlers). One JSON
// line per event on stdout. Callers pass metadata only: never headers,
// tokens, cookies or request/response bodies.

export type LogFields = Record<string, string | number | boolean | null>;

export function logInfo(message: string, fields: LogFields): void {
  process.stdout.write(
    `${JSON.stringify({ level: 'info', time: new Date().toISOString(), msg: message, ...fields })}\n`,
  );
}

export function logError(message: string, fields: LogFields): void {
  process.stderr.write(
    `${JSON.stringify({ level: 'error', time: new Date().toISOString(), msg: message, ...fields })}\n`,
  );
}
