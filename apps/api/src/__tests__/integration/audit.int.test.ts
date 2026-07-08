/**
 * Audit logging integration (task 3.9 × task 3.8) — every decryptPII call
 * made by a procedure persists an AuditEvent row, independently of whether
 * the tRPC response ultimately succeeds (fire-and-forget guarantee).
 */
import './helpers/load-env.js';

import { encryptPII } from '@packages/crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { getEnv } from '../../env.js';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  createAuthedUser,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type TestServer,
} from './helpers/setup.js';

describe.skipIf(!authReady)('decryption audit trail', () => {
  let server: TestServer;
  let sportId: string;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
  });

  afterAll(async () => {
    await deleteTestSport(sportId);
    await server.close();
  });

  it('getProfile persists an AuditEvent with the correct actor, action, and resource', async () => {
    const user = await createAuthedUser({ sportId, label: 'audit' });
    try {
      if (user.athleteId === null) throw new Error('fixture invariant');
      const client = apiClient(server.url, user.accessToken);
      await client.athlete.updateProfile.mutate({ govId: 'CC-1122334455' });

      await client.athlete.getProfile.query({ athleteId: user.athleteId });

      // The AuditEvent write is fire-and-forget — poll until it lands.
      const events = await vi.waitFor(async () => {
        const found = await prisma.auditEvent.findMany({
          where: { athleteId: user.athleteId ?? '', purposeCode: 'getProfile' },
          select: {
            actorUserAccountId: true,
            eventType: true,
            targetType: true,
            targetId: true,
            requestId: true,
            metadata: true,
          },
        });
        expect(found.length).toBeGreaterThanOrEqual(1);
        return found;
      }, { timeout: 10_000 });

      for (const event of events) {
        expect(event.actorUserAccountId).toBe(user.userAccountId);
        expect(event.eventType).toBe('DECRYPT_PII');
        expect(event.targetType).toBe('athlete_private_profiles');
        expect(event.targetId).toBe(user.athleteId);
        expect(event.requestId).toBeTruthy();
      }
      // getProfile decrypted exactly the one populated L2 field.
      expect(events.map((event) => event.metadata)).toContainEqual({ field: 'govIdEnc' });
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  it('persists the AuditEvent even when the tRPC call errors after the decrypt', async () => {
    const user = await createAuthedUser({ sportId, label: 'auditerr' });
    try {
      if (user.athleteId === null) throw new Error('fixture invariant');
      // Plant a value that decrypts fine but fails the output schema
      // (exactDob must be an ISO date): the decrypt — and its audit — happen
      // while building the response, then output validation rejects it.
      const masterKey = getEnv().MASTER_ENCRYPTION_KEY;
      await prisma.athletePrivateProfile.update({
        where: { athleteId: user.athleteId },
        data: { exactDobEnc: Uint8Array.from(encryptPII('not-a-date', masterKey)) },
        select: { athleteId: true },
      });

      await expectTRPCCode(
        apiClient(server.url, user.accessToken).athlete.getProfile.query({
          athleteId: user.athleteId,
        }),
        'INTERNAL_SERVER_ERROR',
      );

      // Fire-and-forget guarantee: the failed response did not lose the audit.
      await vi.waitFor(async () => {
        const events = await prisma.auditEvent.findMany({
          where: { athleteId: user.athleteId ?? '', purposeCode: 'getProfile' },
          select: { eventType: true, metadata: true },
        });
        expect(events.map((event) => event.metadata)).toContainEqual({ field: 'exactDobEnc' });
        expect(events.every((event) => event.eventType === 'DECRYPT_PII')).toBe(true);
      }, { timeout: 10_000 });
    } finally {
      await cleanupAuthedUser(user);
    }
  });
});
