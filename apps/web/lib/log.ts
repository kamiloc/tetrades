// Structured logger for web server code (route handlers), built on Pino like
// the API. Call sites can pass only the fixed metadata fields below, so a
// header, token, cookie or request/response body never reaches a log line.
// Redaction mirrors the API's key list as a second line of defense.
import pino, { type DestinationStream, type Logger } from 'pino';

/** The only fields a web log line may carry. */
export interface LogFields {
  requestId: string;
  method: string;
  procedure: string;
  status: number;
}

/** Keys censored if they ever appear, at the top level or one level down. */
export const REDACT_PATHS: readonly string[] = [
  'authorization',
  'cookie',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'jwt',
  'password',
  'secret',
  '*.authorization',
  '*.cookie',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
  '*.jwt',
  '*.password',
  '*.secret',
];

export function createWebLogger(destination?: DestinationStream): Logger {
  const options = {
    level: process.env['LOG_LEVEL'] ?? 'info',
    base: { service: 'web' },
    redact: { paths: [...REDACT_PATHS], censor: '[REDACTED]' },
  };
  return destination === undefined ? pino(options) : pino(options, destination);
}

const logger = createWebLogger();

export function logInfo(message: string, fields: LogFields): void {
  logger.info(fields, message);
}

export function logError(message: string, fields: LogFields): void {
  logger.error(fields, message);
}
