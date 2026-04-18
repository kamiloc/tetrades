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

export const documentStatusEnum = z.enum([
  'UPLOADED',
  'PROCESSING',
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED',
]);
export type DocumentStatus = z.infer<typeof documentStatusEnum>;

export const ocrJobStatusEnum = z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED']);
export type OcrJobStatus = z.infer<typeof ocrJobStatusEnum>;

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
