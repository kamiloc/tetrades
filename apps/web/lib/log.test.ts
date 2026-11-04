import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createWebLogger } from './log';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { lines, logger: createWebLogger(stream) };
}

describe('web logger', () => {
  it('writes one JSON line with the metadata fields', () => {
    const { lines, logger } = capture();
    logger.info(
      { requestId: 'req-1', method: 'GET', procedure: 'admin.listClubs', status: 200 },
      'trpc proxy',
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 30,
      msg: 'trpc proxy',
      service: 'web',
      requestId: 'req-1',
      method: 'GET',
      procedure: 'admin.listClubs',
      status: 200,
    });
  });

  it('redacts token and cookie keys even if a caller passes them', () => {
    const { lines, logger } = capture();
    logger.info(
      { authorization: 'Bearer live-token', headers: { cookie: 'sb=secret-cookie' } },
      'leak attempt',
    );
    const logged = JSON.stringify(lines);
    expect(logged).not.toContain('live-token');
    expect(logged).not.toContain('secret-cookie');
    expect(lines[0]).toMatchObject({
      authorization: '[REDACTED]',
      headers: { cookie: '[REDACTED]' },
    });
  });
});
