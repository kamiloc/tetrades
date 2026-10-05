import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { devicePlatformEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Push tokens identify a device, so the token is L1 and never travels
// through job payloads (the worker resolves tokens server-side).
// ──────────────────────────────────────────────

/** Expo push token, e.g. ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]. */
export const expoPushTokenSchema = z
  .string()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/, 'Invalid Expo push token');

export const deviceTokenSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  userAccountId: cuidSchema, /// L1-INTERNAL
  token: expoPushTokenSchema, /// L1-INTERNAL
  platform: devicePlatformEnum, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  lastSeenAt: datetimeSchema, /// L1-INTERNAL
});
export type DeviceToken = z.infer<typeof deviceTokenSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS — the account is derived from ctx.userId
// ──────────────────────────────────────────────

export const registerDeviceTokenInput = deviceTokenSchema.pick({ token: true, platform: true });
export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenInput>;

export const removeDeviceTokenInput = deviceTokenSchema.pick({ token: true });
export type RemoveDeviceTokenInput = z.infer<typeof removeDeviceTokenInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — never echo the token
// ──────────────────────────────────────────────

export const deviceTokenOwnerOutput = deviceTokenSchema.pick({
  id: true,
  platform: true,
  createdAt: true,
  lastSeenAt: true,
});
export type DeviceTokenOwnerOutput = z.infer<typeof deviceTokenOwnerOutput>;

export const removeDeviceTokenOutput = z.object({ removed: z.boolean() });
export type RemoveDeviceTokenOutput = z.infer<typeof removeDeviceTokenOutput>;
