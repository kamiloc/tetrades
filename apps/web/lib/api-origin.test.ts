import { describe, expect, it } from 'vitest';

import { parseApiTrpcUrl } from './api-origin';

describe('parseApiTrpcUrl', () => {
  it.each([
    ['http://localhost:4000/trpc', 'http://localhost:4000/trpc'],
    ['http://localhost:4000/trpc/', 'http://localhost:4000/trpc'],
    ['http://localhost:4000', 'http://localhost:4000/trpc'],
    ['https://api.example.co/v1/trpc', 'https://api.example.co/v1/trpc'],
  ])('handles %s', (value, expected) => {
    expect(parseApiTrpcUrl(value)).toBe(expected);
  });

  it.each([undefined, '', 'not a url', 'ftp://api.example.co'])('rejects %s', (value) => {
    expect(() => parseApiTrpcUrl(value)).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
