/**
 * trainer-invitation-redaction (ADR-017, design D13; trainer-provisioning
 * spec "Ended invitations lose their email after 90 days") against the real
 * database, plus the daily schedule registration against real Redis when
 * UPSTASH_REDIS_URL is set.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { closeRedis, createQueueRegistry, createRedisConnection, QUEUE_NAMES } from '@packages/queue';
import type { FastifyBaseLogger } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  REDACTION_CRON,
  REDACTION_SCHEDULER_ID,
  runTrainerInvitationRedaction,
  scheduleTrainerInvitationRedaction,
} from '../../jobs/redactTrainerInvitations.js';

import {
  cleanupFixtureTrainer,
  cleanupTestClub,
  createFixtureTrainer,
  createTestClub,
  dbReady,
  prisma,
  type FixtureTrainer,
} from './helpers/setup.js';

const DAY_MS = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

describe.skipIf(!dbReady)('runTrainerInvitationRedaction', () => {
  const log = { info: vi.fn() };
  let clubId: string;
  let adminId: string;
  let activeTrainer: FixtureTrainer;
  let longRevoked: FixtureTrainer;
  let recentlyRevoked: FixtureTrainer;
  const ids: Record<string, string> = {};
  const emails: Record<string, string> = {};

  /** Inserts PENDING (the only allowed insert) and walks it to `status`. */
  async function invitation(
    label: string,
    args: {
      status: 'PENDING' | 'DECLINED' | 'REVOKED' | 'ACCEPTED';
      expiresAt?: Date;
      respondedAt?: Date;
      acceptedBy?: string;
    },
  ): Promise<void> {
    const email = `${label.toLowerCase()}.${randomUUID().slice(0, 8)}@club.co`;
    const { id } = await prisma.clubTrainerInvitation.create({
      data: {
        clubId,
        email,
        invitedByUserAccountId: adminId,
        expiresAt: args.expiresAt ?? new Date(Date.now() + 14 * DAY_MS),
      },
      select: { id: true },
    });
    if (args.status !== 'PENDING') {
      await prisma.clubTrainerInvitation.update({
        where: { id },
        data: {
          status: args.status,
          respondedAt: args.respondedAt ?? new Date(),
          ...(args.acceptedBy === undefined ? {} : { acceptedByUserAccountId: args.acceptedBy }),
        },
        select: { id: true },
      });
    }
    ids[label] = id;
    emails[label] = email;
  }

  async function trainerRow(fx: FixtureTrainer, revokedAt: Date | null): Promise<void> {
    await prisma.clubTrainer.create({
      data: { clubId, userAccountId: fx.userAccountId, revokedAt },
      select: { id: true },
    });
  }

  const row = (label: string) =>
    prisma.clubTrainerInvitation.findUniqueOrThrow({
      where: { id: ids[label] ?? '' },
      select: { email: true, status: true, redactedAt: true, respondedAt: true, clubId: true },
    });

  beforeAll(async () => {
    clubId = await createTestClub('redact');
    adminId = (
      await prisma.userAccount.create({
        data: { supabaseUserId: randomUUID(), role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      })
    ).id;
    [activeTrainer, longRevoked, recentlyRevoked] = await Promise.all([
      createFixtureTrainer(),
      createFixtureTrainer(),
      createFixtureTrainer(),
    ]);
    await trainerRow(activeTrainer, null);
    await trainerRow(longRevoked, daysAgo(91));
    await trainerRow(recentlyRevoked, daysAgo(89));

    await invitation('declined91', { status: 'DECLINED', respondedAt: daysAgo(91) });
    await invitation('declined89', { status: 'DECLINED', respondedAt: daysAgo(89) });
    await invitation('revoked91', { status: 'REVOKED', respondedAt: daysAgo(91) });
    await invitation('expired91', { status: 'PENDING', expiresAt: daysAgo(91) });
    await invitation('expired89', { status: 'PENDING', expiresAt: daysAgo(89) });
    await invitation('acceptedActive', {
      status: 'ACCEPTED', respondedAt: daysAgo(400), acceptedBy: activeTrainer.userAccountId,
    });
    await invitation('acceptedRevoked91', {
      status: 'ACCEPTED', respondedAt: daysAgo(400), acceptedBy: longRevoked.userAccountId,
    });
    await invitation('acceptedRevoked89', {
      status: 'ACCEPTED', respondedAt: daysAgo(400), acceptedBy: recentlyRevoked.userAccountId,
    });
  });

  afterAll(async () => {
    await cleanupTestClub(clubId);
    for (const fx of [activeTrainer, longRevoked, recentlyRevoked]) await cleanupFixtureTrainer(fx);
    await prisma.userAccount.deleteMany({ where: { id: adminId } });
  });

  it('redacts only invitations that ended more than 90 days ago, keeping everything else', async () => {
    const before = await row('declined91');
    const counts = await runTrainerInvitationRedaction({ prisma, log }, { requestId: 'req-redact-1' });
    expect(counts.declinedOrRevoked).toBeGreaterThanOrEqual(2);
    expect(counts.expired).toBeGreaterThanOrEqual(1);
    expect(counts.acceptedAfterRevocation).toBeGreaterThanOrEqual(1);

    for (const label of ['declined91', 'revoked91', 'expired91', 'acceptedRevoked91']) {
      const r = await row(label);
      expect(r.email, label).toBe(`redacted:${ids[label] ?? ''}`);
      expect(r.redactedAt, label).not.toBeNull();
    }
    for (const label of ['declined89', 'expired89', 'acceptedActive', 'acceptedRevoked89']) {
      const r = await row(label);
      expect(r.email, label).toBe(emails[label]);
      expect(r.redactedAt, label).toBeNull();
    }

    // Status, club and dates are unchanged by redaction.
    const after = await row('declined91');
    expect({ ...after, email: undefined, redactedAt: undefined }).toEqual({
      ...before,
      email: undefined,
      redactedAt: undefined,
    });
    expect((await row('expired91')).status).toBe('PENDING');
  });

  it('logs counts with the requestId and never an email', () => {
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'trainer_invitation_redaction_completed', requestId: 'req-redact-1' }),
      expect.any(String),
    );
    const logged = JSON.stringify(log.info.mock.calls);
    for (const email of Object.values(emails)) expect(logged).not.toContain(email);
  });

  it('changes nothing when run again', async () => {
    const snapshot = await Promise.all(Object.keys(ids).map((label) => row(label)));
    const counts = await runTrainerInvitationRedaction({ prisma, log }, { requestId: 'req-redact-2' });
    expect(counts).toEqual({ declinedOrRevoked: 0, expired: 0, acceptedAfterRevocation: 0 });
    expect(await Promise.all(Object.keys(ids).map((label) => row(label)))).toEqual(snapshot);
  });
});

const REDIS_URL = process.env['UPSTASH_REDIS_URL'] ?? '';

describe.skipIf(REDIS_URL.length === 0)('scheduleTrainerInvitationRedaction', () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as FastifyBaseLogger;
  const connection = createRedisConnection(REDIS_URL, logger);
  const registry = createQueueRegistry(connection);
  const queue = registry.queues[QUEUE_NAMES.TRAINER_INVITATION_REDACTION];

  afterAll(async () => {
    await registry.close();
    await closeRedis(connection);
  });

  it('registers one daily scheduler, idempotently across restarts', async () => {
    await scheduleTrainerInvitationRedaction(registry, logger);
    await scheduleTrainerInvitationRedaction(registry, logger);
    const schedulers = await queue.getJobSchedulers();
    const ours = schedulers.filter((s) => s.key === REDACTION_SCHEDULER_ID);
    expect(ours).toHaveLength(1);
    expect(ours[0]?.pattern).toBe(REDACTION_CRON);
    const template = await queue.getJobScheduler(REDACTION_SCHEDULER_ID);
    expect(template?.template?.data).toEqual({ requestId: 'scheduled:trainer-invitation-redaction' });
  });
});
