import { describe, expect, it } from 'vitest';

import { safeNext } from './safe-next';

const ORIGIN = 'https://portal.example.co';

describe('safeNext', () => {
  it.each(['/admin/clubs?status=ALL', '/trainer/invitations', '/admin/clubs/abc/trainers#x'])(
    'accepts the relative path %s',
    (value) => {
      expect(safeNext(value, ORIGIN)).toBe(value);
    },
  );

  it.each([
    ['an absolute URL', 'https://evil.test'],
    ['a protocol-relative URL', '//evil.test'],
    ['a backslash trick', '/\\evil.test'],
    ['a newline', '/admin\n/clubs'],
    ['a tab', '/\t/evil.test'],
    ['a NUL byte', '/admin\u0000'],
    ['a relative path without a slash', 'admin/clubs'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an empty string', ''],
    ['a non-string', 42],
    ['an over-long value', `/${'a'.repeat(2048)}`],
  ])('rejects %s', (_label, value) => {
    expect(safeNext(value, ORIGIN)).toBeNull();
  });

  it('resolves against the configured origin, not the request host', () => {
    expect(safeNext('/admin/clubs', 'http://localhost:3000')).toBe('/admin/clubs');
  });
});
