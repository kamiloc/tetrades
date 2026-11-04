import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAppOrigin, parseAppOrigin } from './app-origin';

describe('parseAppOrigin', () => {
  it('accepts a local origin', () => {
    expect(parseAppOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('accepts a deployed origin, with or without a trailing slash', () => {
    expect(parseAppOrigin('https://portal.example.co')).toBe('https://portal.example.co');
    expect(parseAppOrigin('https://portal.example.co/')).toBe('https://portal.example.co');
  });

  it.each([
    ['missing', undefined],
    ['empty', '  '],
    ['a path', 'https://portal.example.co/app'],
    ['a query', 'https://portal.example.co/?x=1'],
    ['javascript:', 'javascript:alert(1)'],
    ['ftp:', 'ftp://portal.example.co'],
    ['not a URL', 'portal.example.co'],
    ['credentials', 'https://user:pass@portal.example.co'],
  ])('rejects %s', (_label, value) => {
    expect(() => parseAppOrigin(value)).toThrow(/WEB_URL/);
  });
});

describe('getAppOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads WEB_URL', () => {
    vi.stubEnv('WEB_URL', 'https://portal.example.co');
    expect(getAppOrigin()).toBe('https://portal.example.co');
  });

  it('throws when WEB_URL is missing', () => {
    vi.stubEnv('WEB_URL', '');
    expect(() => getAppOrigin()).toThrow(/WEB_URL is not set/);
  });
});
