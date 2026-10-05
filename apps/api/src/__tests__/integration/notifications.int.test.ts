/**
 * Notifications (tasks 7.3–7.4, membership-notifications spec) — real DB and
 * real Supabase JWTs. Substitutes: a recording / failing job port (to observe
 * enqueues without workers) and a fake fetch standing in for Expo's push API.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import type { NotificationJobData, QueueJobData, QueueName } from '@packages/queue';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { JobEnqueuer } from '../../lib/jobs.js';
import { EXPO_PUSH_URL, PUSH_COPY, sendPushNotification } from '../../services/notifications.js';

import {
  addClubTrainer,
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupTestClub,
  createAuthedUser,
  createTestClub,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

const pushToken = () => `ExponentPushToken[int${randomUUID().replace(/-/g, '').slice(0, 16)}]`;

function athleteIdOf(user: AuthedUser): string {
  if (user.athleteId === null) throw new Error('fixture invariant: user has an athlete');
  return user.athleteId;
}

describe.skipIf(!authReady)('notifications', () => {
  const enqueued: { queue: QueueName; data: QueueJobData[QueueName] }[] = [];
  const recorder: JobEnqueuer = {
    enqueue(queue, data) {
      enqueued.push({ queue, data });
      return Promise.resolve();
    },
  };
  const failing: JobEnqueuer = { enqueue: () => Promise.reject(new Error('redis down')) };

  let server: TestServer;
  let failingServer: TestServer;
  let sportId: string;
  let clubId: string;
  let owner: AuthedUser;
  let other: AuthedUser;
  let trainerOnly: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ authenticated: 100_000 }, { jobs: recorder });
    failingServer = await startServer({ authenticated: 100_000 }, { jobs: failing });
    sportId = await createTestSport();
    [owner, other] = await Promise.all([
      createAuthedUser({ sportId, label: 'nt-own' }),
      createAuthedUser({ sportId, label: 'nt-oth' }),
    ]);
    trainerOnly = await createAuthedUser({ withAthlete: false, label: 'nt-tr' });
    clubId = await createTestClub('nt');
    await addClubTrainer(clubId, trainerOnly.userAccountId);
  });

  afterAll(async () => {
    await cleanupTestClub(clubId);
    for (const u of [owner, other, trainerOnly]) {
      await prisma.deviceToken.deleteMany({ where: { userAccountId: u.userAccountId } });
      await cleanupAuthedUser(u);
    }
    await deleteTestSport(sportId);
    await server.close();
    await failingServer.close();
  });

  const tokensOf = (user: AuthedUser) =>
    prisma.deviceToken.findMany({ where: { userAccountId: user.userAccountId }, select: { token: true } });

  // ── 7.3 registerDeviceToken / removeDeviceToken ──────────────────────────

  describe('notification.registerDeviceToken', () => {
    it('registers a token for the caller without echoing it', async () => {
      const token = pushToken();
      const result = await apiClient(server.url, owner.accessToken).notification.registerDeviceToken.mutate({
        token,
        platform: 'ANDROID',
      });
      expect(result.platform).toBe('ANDROID');
      expect(Object.keys(result)).not.toContain('token');
      expect((await tokensOf(owner)).map((t) => t.token)).toContain(token);
    });

    it('works for a trainer-only account with no athlete profile', async () => {
      const token = pushToken();
      await apiClient(server.url, trainerOnly.accessToken).notification.registerDeviceToken.mutate({
        token,
        platform: 'IOS',
      });
      expect((await tokensOf(trainerOnly)).map((t) => t.token)).toContain(token);
    });

    it('moves a token to the account that registers it on the same device', async () => {
      const token = pushToken();
      await apiClient(server.url, owner.accessToken).notification.registerDeviceToken.mutate({ token, platform: 'IOS' });
      await apiClient(server.url, other.accessToken).notification.registerDeviceToken.mutate({ token, platform: 'IOS' });
      expect((await tokensOf(owner)).map((t) => t.token)).not.toContain(token);
      expect((await tokensOf(other)).map((t) => t.token)).toContain(token);
    });

    it('rejects invalid input', async () => {
      await expectTRPCCode(
        apiClient(server.url, owner.accessToken).notification.registerDeviceToken.mutate({
          token: 'not-a-push-token',
          platform: 'IOS',
        }),
        'BAD_REQUEST',
      );
    });

    it('is UNAUTHORIZED without a token', async () => {
      await expectTRPCCode(
        apiClient(server.url).notification.registerDeviceToken.mutate({ token: pushToken(), platform: 'IOS' }),
        'UNAUTHORIZED',
      );
    });

    it('is NOT_FOUND for an authenticated user without an account row', async () => {
      const orphan = await createAuthedUser({ withAthlete: false, label: 'nt-orphan' });
      await prisma.userAccount.delete({ where: { id: orphan.userAccountId }, select: { id: true } });
      try {
        await expectTRPCCode(
          apiClient(server.url, orphan.accessToken).notification.registerDeviceToken.mutate({
            token: pushToken(),
            platform: 'IOS',
          }),
          'NOT_FOUND',
        );
      } finally {
        await cleanupAuthedUser(orphan);
      }
    });
  });

  describe('notification.removeDeviceToken', () => {
    it("cannot remove another user's token, and the owner can", async () => {
      const token = pushToken();
      await apiClient(server.url, owner.accessToken).notification.registerDeviceToken.mutate({ token, platform: 'IOS' });

      expect(
        await apiClient(server.url, other.accessToken).notification.removeDeviceToken.mutate({ token }),
      ).toEqual({ removed: false });
      expect((await tokensOf(owner)).map((t) => t.token)).toContain(token);

      expect(
        await apiClient(server.url, owner.accessToken).notification.removeDeviceToken.mutate({ token }),
      ).toEqual({ removed: true });
      expect((await tokensOf(owner)).map((t) => t.token)).not.toContain(token);
    });

    it('rejects invalid input and is UNAUTHORIZED without a token', async () => {
      await expectTRPCCode(
        apiClient(server.url, owner.accessToken).notification.removeDeviceToken.mutate({ token: 'x' }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        apiClient(server.url).notification.removeDeviceToken.mutate({ token: pushToken() }),
        'UNAUTHORIZED',
      );
    });
  });

  // ── 7.4 CLUB_INVITATION enqueue + delivery ────────────────────────────────

  describe('club invitation notification', () => {
    const resetMemberships = () =>
      prisma.clubMembership.deleteMany({ where: { athleteId: athleteIdOf(owner) } });

    it('enqueues an identifier-only CLUB_INVITATION after the membership is persisted', async () => {
      await resetMemberships();
      const before = enqueued.length;
      const membership = await apiClient(server.url, trainerOnly.accessToken).club.inviteAthlete.mutate({
        clubId,
        athleteId: athleteIdOf(owner),
      });
      const jobs = enqueued.slice(before);
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.queue).toBe('notifications');
      expect(jobs[0]?.data).toMatchObject({
        userAccountId: owner.userAccountId,
        notificationType: 'CLUB_INVITATION',
        subjectId: membership.id,
      });
      expect(Object.keys(jobs[0]?.data ?? {}).sort()).toEqual(
        ['notificationType', 'requestId', 'subjectId', 'userAccountId'],
      );
    });

    it('still creates the invitation when the notification cannot be enqueued', async () => {
      await resetMemberships();
      const membership = await apiClient(failingServer.url, trainerOnly.accessToken).club.inviteAthlete.mutate({
        clubId,
        athleteId: athleteIdOf(owner),
      });
      expect(membership.status).toBe('PENDING_ATHLETE_CONFIRMATION');
      expect(await prisma.clubMembership.count({ where: { id: membership.id } })).toBe(1);
    });
  });

  describe('sendPushNotification', () => {
    const silent = { info: () => undefined, warn: () => undefined };
    const job = (userAccountId: string): NotificationJobData => ({
      userAccountId,
      notificationType: 'CLUB_INVITATION',
      subjectId: 'cmembership00000000000000',
      requestId: 'req-push',
    });

    interface Call {
      url: string;
      body: unknown;
    }
    const fakeFetch = (calls: Call[], respond: (messages: unknown[]) => Response): typeof fetch =>
      ((url: string | URL | Request, init?: RequestInit) => {
        const body: unknown = JSON.parse(typeof init?.body === 'string' ? init.body : '[]');
        calls.push({ url: String(url), body });
        return Promise.resolve(respond(Array.isArray(body) ? body : []));
      }) as typeof fetch;

    it('sends nothing and surfaces no error when the recipient has no device', async () => {
      await prisma.deviceToken.deleteMany({ where: { userAccountId: other.userAccountId } });
      const calls: Call[] = [];
      const result = await sendPushNotification(
        { prisma, fetch: fakeFetch(calls, () => Response.json({ data: [] })), log: silent },
        job(other.userAccountId),
      );
      expect(result).toEqual({ sent: 0, removedTokens: 0 });
      expect(calls).toHaveLength(0);
    });

    it('delivers fixed copy with no personal data and removes unregistered tokens', async () => {
      await prisma.deviceToken.deleteMany({ where: { userAccountId: owner.userAccountId } });
      const [live, dead] = [pushToken(), pushToken()];
      await prisma.deviceToken.createMany({
        data: [
          { userAccountId: owner.userAccountId, token: live, platform: 'IOS' },
          { userAccountId: owner.userAccountId, token: dead, platform: 'ANDROID' },
        ],
      });
      const calls: Call[] = [];
      const result = await sendPushNotification(
        {
          prisma,
          fetch: fakeFetch(calls, (messages) =>
            Response.json({
              data: messages.map((m) =>
                typeof m === 'object' && m !== null && 'to' in m && m.to === dead
                  ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
                  : { status: 'ok', id: randomUUID() },
              ),
            }),
          ),
          log: silent,
        },
        job(owner.userAccountId),
      );

      expect(result).toEqual({ sent: 2, removedTokens: 1 });
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(EXPO_PUSH_URL);
      for (const message of calls[0]?.body as Record<string, unknown>[]) {
        expect(message['title']).toBe(PUSH_COPY.CLUB_INVITATION.title);
        expect(message['body']).toBe(PUSH_COPY.CLUB_INVITATION.body);
        expect(message['data']).toEqual({ type: 'CLUB_INVITATION', subjectId: 'cmembership00000000000000' });
      }
      // No athlete, club, or account details anywhere in what left the server.
      const sent = JSON.stringify(calls[0]?.body);
      for (const secret of [owner.email, athleteIdOf(owner), owner.userAccountId, clubId]) {
        expect(sent).not.toContain(secret);
      }
      expect((await tokensOf(owner)).map((t) => t.token)).toEqual([live]);
    });

    it('throws on a non-2xx response so the job is retried', async () => {
      await prisma.deviceToken.deleteMany({ where: { userAccountId: owner.userAccountId } });
      await prisma.deviceToken.create({
        data: { userAccountId: owner.userAccountId, token: pushToken(), platform: 'IOS' },
        select: { id: true },
      });
      await expect(
        sendPushNotification(
          { prisma, fetch: fakeFetch([], () => new Response('busy', { status: 503 })), log: silent },
          job(owner.userAccountId),
        ),
      ).rejects.toThrow('503');
    });
  });
});
