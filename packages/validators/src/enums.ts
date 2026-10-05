import { z } from 'zod';

export const userRoleEnum = z.enum(['ATHLETE', 'SYSTEM']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const accountStatusEnum = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
export type AccountStatus = z.infer<typeof accountStatusEnum>;

export const profileStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'HIDDEN', 'LOCKED']);
export type ProfileStatus = z.infer<typeof profileStatusEnum>;

export const onboardingStatusEnum = z.enum([
  'NOT_STARTED',
  'IDENTITY_PENDING',
  'CONSENT_PENDING',
  'COMPLETE',
]);
export type OnboardingStatus = z.infer<typeof onboardingStatusEnum>;

export const connectionStatusEnum = z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED']);
export type ConnectionStatus = z.infer<typeof connectionStatusEnum>;

export const verificationStatusEnum = z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']);
export type VerificationStatus = z.infer<typeof verificationStatusEnum>;

export const photoVariantEnum = z.enum(['ORIGINAL', 'THUMB_150', 'CARD_400', 'FULL_1200']);
export type PhotoVariant = z.infer<typeof photoVariantEnum>;

export const processingStatusEnum = z.enum(['QUEUED', 'RUNNING', 'READY', 'FAILED']);
export type ProcessingStatus = z.infer<typeof processingStatusEnum>;

export const dataLifecycleTypeEnum = z.enum(['EXPORT', 'DELETION', 'RECTIFICATION']);
export type DataLifecycleType = z.infer<typeof dataLifecycleTypeEnum>;

export const dataLifecycleStatusEnum = z.enum([
  'REQUESTED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED_LEGAL_HOLD',
  'FAILED',
]);
export type DataLifecycleStatus = z.infer<typeof dataLifecycleStatusEnum>;

// ADR-013 §5 — only ACTIVE grants trainer access.
export const clubMembershipStatusEnum = z.enum([
  'PENDING_ATHLETE_CONFIRMATION',
  'ACTIVE',
  'COMPLETED',
  'REJECTED',
]);
export type ClubMembershipStatus = z.infer<typeof clubMembershipStatusEnum>;

// ADR-013 — a missing AthleteVisibilitySettings row resolves to PRIVATE.
export const visibilityAudienceEnum = z.enum(['PRIVATE', 'CONNECTIONS', 'PUBLIC']);
export type VisibilityAudience = z.infer<typeof visibilityAudienceEnum>;

export const devicePlatformEnum = z.enum(['IOS', 'ANDROID']);
export type DevicePlatform = z.infer<typeof devicePlatformEnum>;
