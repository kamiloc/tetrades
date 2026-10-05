/**
 * Device token registration (membership-notifications spec, design D9).
 * Owner-only by construction: the account always comes from ctx.userId.
 *
 * Tokens are unique per device. Registering a token that another account
 * held moves it to the caller: the device has signed in as someone else, and
 * the previous account must stop receiving pushes there.
 */
import type {
  DeviceTokenOwnerOutput,
  RegisterDeviceTokenInput,
  RemoveDeviceTokenInput,
  RemoveDeviceTokenOutput,
} from '@packages/validators';
import type { PrismaClient } from '@prisma/client';

import type { Viewer } from './viewer.js';

export function registerDeviceToken(
  prisma: PrismaClient,
  viewer: Viewer,
  input: RegisterDeviceTokenInput,
): Promise<DeviceTokenOwnerOutput> {
  return prisma.deviceToken.upsert({
    where: { token: input.token },
    create: { userAccountId: viewer.userAccountId, token: input.token, platform: input.platform },
    update: { userAccountId: viewer.userAccountId, platform: input.platform, lastSeenAt: new Date() },
    select: { id: true, platform: true, createdAt: true, lastSeenAt: true },
  });
}

/** Removes the token only if it belongs to the caller; never reveals another account's token. */
export async function removeDeviceToken(
  prisma: PrismaClient,
  viewer: Viewer,
  input: RemoveDeviceTokenInput,
): Promise<RemoveDeviceTokenOutput> {
  const { count } = await prisma.deviceToken.deleteMany({
    where: { token: input.token, userAccountId: viewer.userAccountId },
  });
  return { removed: count > 0 };
}
