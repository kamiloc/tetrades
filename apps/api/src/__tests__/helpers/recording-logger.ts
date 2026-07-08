/**
 * Recording FastifyBaseLogger for tests — captures every line so log
 * ordering, levels, and structured payloads can be asserted. Used by the
 * queue infrastructure unit and integration suites (task 4.1).
 */
import type { FastifyBaseLogger } from 'fastify';

export interface RecordedLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  obj: Record<string, unknown>;
  msg: string | undefined;
}

export function makeRecordingLogger(lines: RecordedLog[]): FastifyBaseLogger {
  const record =
    (level: RecordedLog['level']) =>
    (obj: unknown, msg?: string): void => {
      lines.push({
        level,
        obj: typeof obj === 'object' && obj !== null ? (obj as Record<string, unknown>) : {},
        msg: typeof obj === 'string' ? obj : msg,
      });
    };

  const logger = {
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    debug: record('debug'),
    fatal: record('error'),
    trace: record('debug'),
    silent: () => undefined,
    level: 'info',
    child: () => logger,
  };
  return logger as unknown as FastifyBaseLogger;
}
