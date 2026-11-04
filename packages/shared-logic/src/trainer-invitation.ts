// Trainer invitation state (ADR-017). Pure constants and functions only.
// The literal values mirror `trainerInvitationStatusEnum` and
// `trainerInvitationStateEnum` in @packages/validators; apps/api asserts the
// two stay identical at compile time.

export const TRAINER_INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED'] as const;
export type TrainerInvitationStatusValue = (typeof TRAINER_INVITATION_STATUSES)[number];

export const TRAINER_INVITATION_STATES = [
  'PENDING',
  'EXPIRED',
  'ACCEPTED',
  'DECLINED',
  'REVOKED',
] as const;
export type TrainerInvitationStateValue = (typeof TRAINER_INVITATION_STATES)[number];

// EXPIRED is never stored: a PENDING invitation is expired from the instant
// `expiresAt` is reached. Terminal statuses are returned as stored.
export function trainerInvitationState(
  status: TrainerInvitationStatusValue,
  expiresAt: Date,
  now: Date,
): TrainerInvitationStateValue {
  if (status === 'PENDING' && expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return status;
}
