import { describe, expect, it } from 'vitest';

import { chooseLanding } from './auth-flow';

const ORIGIN = 'https://portal.example.co';

describe('chooseLanding', () => {
  it('lands a non-admin on /trainer', async () => {
    expect(await chooseLanding('', 'token', ORIGIN, async () => false)).toBe('/trainer');
  });

  it('lands an admin on /admin/clubs', async () => {
    expect(await chooseLanding('', 'token', ORIGIN, async () => true)).toBe('/admin/clubs');
  });

  it('prefers a safe next over either landing', async () => {
    expect(await chooseLanding('/trainer/invitations', 'token', ORIGIN, async () => true)).toBe(
      '/trainer/invitations',
    );
  });
});
