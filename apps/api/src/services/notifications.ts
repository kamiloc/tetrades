/**
 * Push delivery (membership-notifications spec, design D9) through Expo's
 * HTTP push API with native fetch (no SDK dependency).
 *
 * Job payloads carry identifiers only (recipient account, type, subject id,
 * requestId). This module owns the copy, resolves tokens server-side, and
 * sends no personal data: the message names no club, trainer, or athlete,
 * and `data` carries only the type and subject id for in-app routing.
 * Tokens Expo reports as DeviceNotRegistered are deleted. A non-2xx
 * response throws so BullMQ retries; the invitation itself is unaffected.
 */
import type { NotificationJobData } from '@packages/queue';
import type { PrismaClient } from '@prisma/client';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

type NotificationType = NotificationJobData['notificationType'];

/** Fixed copy per type; the user's language is Spanish (Colombia). */
export const PUSH_COPY: Readonly<Record<NotificationType, { title: string; body: string }>> = {
  CONNECTION_REQUEST: {
    title: 'Nueva solicitud de conexión',
    body: 'Un atleta quiere conectar contigo. Abre la app para responder.',
  },
  CONNECTION_ACCEPTED: {
    title: 'Conexión aceptada',
    body: 'Tu solicitud de conexión fue aceptada.',
  },
  CLUB_INVITATION: {
    title: 'Invitación de club',
    body: 'Un club te invitó a unirte. Abre la app para aceptar o rechazar.',
  },
};

export interface PushLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface PushResult {
  sent: number;
  removedTokens: number;
}

/** Narrows Expo's ticket list without trusting the response shape. */
function ticketsOf(body: unknown): unknown[] {
  if (typeof body !== 'object' || body === null || !('data' in body)) return [];
  return Array.isArray(body.data) ? body.data : [];
}

function isDeviceNotRegistered(ticket: unknown): boolean {
  if (typeof ticket !== 'object' || ticket === null) return false;
  if (!('status' in ticket) || ticket.status !== 'error') return false;
  if (!('details' in ticket) || typeof ticket.details !== 'object' || ticket.details === null) return false;
  return 'error' in ticket.details && ticket.details.error === 'DeviceNotRegistered';
}

export async function sendPushNotification(
  deps: { prisma: PrismaClient; fetch: typeof fetch; log: PushLogger },
  job: NotificationJobData,
): Promise<PushResult> {
  const logCtx = { requestId: job.requestId, notificationType: job.notificationType, subjectId: job.subjectId };
  const tokens = await deps.prisma.deviceToken.findMany({
    where: { userAccountId: job.userAccountId },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) {
    deps.log.info({ event: 'push_skipped_no_device', ...logCtx }, 'recipient has no registered device');
    return { sent: 0, removedTokens: 0 };
  }

  const copy = PUSH_COPY[job.notificationType];
  const stale: string[] = [];
  for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
    const batch = tokens.slice(i, i + EXPO_BATCH_SIZE);
    const response = await deps.fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(
        batch.map((t) => ({
          to: t.token,
          title: copy.title,
          body: copy.body,
          sound: 'default',
          data: { type: job.notificationType, subjectId: job.subjectId },
        })),
      ),
    });
    if (!response.ok) {
      throw new Error(`Expo push API responded ${response.status}`);
    }
    // Tickets come back in message order.
    ticketsOf(await response.json()).forEach((ticket, index) => {
      const token = batch[index];
      if (token !== undefined && isDeviceNotRegistered(ticket)) stale.push(token.id);
    });
  }

  if (stale.length > 0) {
    await deps.prisma.deviceToken.deleteMany({ where: { id: { in: stale } } });
  }
  deps.log.info(
    { event: 'push_sent', ...logCtx, devices: tokens.length, removedTokens: stale.length },
    'push notification sent',
  );
  return { sent: tokens.length, removedTokens: stale.length };
}
