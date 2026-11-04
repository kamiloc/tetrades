import { z } from 'zod';

import {
  countryCodeSchema,
  cuidSchema,
  datetimeSchema,
  paginatedOutput,
  paginationInput,
  slugSchema,
} from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Clubs are created and maintained by platform admins (ADR-017). They are
// never deleted, only deactivated; the slug never changes after creation.
// ──────────────────────────────────────────────

export const clubNameSchema = z.string().trim().min(2).max(150);
export const clubCitySchema = z.string().trim().min(1).max(100);

export const clubSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  slug: slugSchema, /// L0-PUBLIC
  name: clubNameSchema, /// L0-PUBLIC
  countryCode: countryCodeSchema, /// L0-PUBLIC
  city: clubCitySchema.nullable(), /// L0-PUBLIC
  deactivatedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type Club = z.infer<typeof clubSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

// Base input of every trainer-only procedure: the club the caller acts for.
// The caller's trainer row for this club is resolved server-side.
export const clubScopedInput = z.object({
  clubId: cuidSchema,
});
export type ClubScopedInput = z.infer<typeof clubScopedInput>;

// Admin: create a club. A new club is active.
export const createClubInput = clubSchema
  .pick({ slug: true, name: true, countryCode: true })
  .extend({ city: clubCitySchema.nullable().optional() });
export type CreateClubInput = z.infer<typeof createClubInput>;

// Admin: edit name, country and city. `.strict()` makes a `slug` key (or any
// other unknown key) a validation error, so the slug can never change.
export const updateClubInput = z
  .object({
    clubId: cuidSchema,
    name: clubNameSchema.optional(),
    countryCode: countryCodeSchema.optional(),
    city: clubCitySchema.nullable().optional(),
  })
  .strict();
export type UpdateClubInput = z.infer<typeof updateClubInput>;

// Admin: get, deactivate or reactivate one club.
export const adminClubIdInput = z.object({
  clubId: cuidSchema,
});
export type AdminClubIdInput = z.infer<typeof adminClubIdInput>;

export const adminClubStatusFilterEnum = z.enum(['ALL', 'ACTIVE', 'DEACTIVATED']);
export type AdminClubStatusFilter = z.infer<typeof adminClubStatusFilterEnum>;

// Admin: clubs newest first, optionally filtered by status.
export const listAdminClubsInput = paginationInput.extend({
  status: adminClubStatusFilterEnum.default('ALL'),
});
export type ListAdminClubsInput = z.infer<typeof listAdminClubsInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

// Every non-admin club output. The timestamps (L1) stay out; `isActive` is
// derived from `deactivatedAt IS NULL`.
export const clubPublicOutput = clubSchema
  .omit({ deactivatedAt: true, createdAt: true })
  .extend({
    isActive: z.boolean(), /// L0-PUBLIC
  });
export type ClubPublicOutput = z.infer<typeof clubPublicOutput>;

// Admin view of a club: timestamps plus the count of non-revoked trainers.
export const adminClubOutput = clubSchema.extend({
  isActive: z.boolean(), /// L0-PUBLIC
  activeTrainerCount: z.number().int().nonnegative(), /// L1-INTERNAL
});
export type AdminClubOutput = z.infer<typeof adminClubOutput>;

export const adminClubListOutput = paginatedOutput(adminClubOutput);
export type AdminClubListOutput = z.infer<typeof adminClubListOutput>;

// Result of deactivation: the club plus what the cascade closed.
export const deactivateClubOutput = z.object({
  club: adminClubOutput,
  cancelledCertificationRequests: z.number().int().nonnegative(), /// L1-INTERNAL
  rejectedMembershipInvitations: z.number().int().nonnegative(), /// L1-INTERNAL
  revokedTrainerInvitations: z.number().int().nonnegative(), /// L1-INTERNAL
});
export type DeactivateClubOutput = z.infer<typeof deactivateClubOutput>;
