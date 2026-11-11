import { describe, expect, it } from 'vitest';

import { chooseLanding } from './auth-flow';

const ORIGIN = 'https://portal.example.co';

describe('chooseLanding', () => {
  it('lands a non-admin on /trainer', async () => {
    expect(await chooseLanding('', 'token', ORIGIN, async () => false)).toBe('/trainer');
  });

  it('lands an admin on the /admin overview', async () => {
    expect(await chooseLanding('', 'token', ORIGIN, async () => true)).toBe('/admin');
  });

  it('prefers a safe next over either landing', async () => {
    expect(await chooseLanding('/trainer/invitations', 'token', ORIGIN, async () => true)).toBe(
      '/trainer/invitations',
    );
  });
});
