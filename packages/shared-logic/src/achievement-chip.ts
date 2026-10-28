// Achievement verification chips (ADR-016). The server's verificationStatus is
// used as-is; clients never derive it. Literal values mirror
// `verificationStatusEnum` in @packages/validators; apps/api asserts the two
// stay identical at compile time.

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;

export type VerificationStatusValue = (typeof VERIFICATION_STATUSES)[number];

export type ChipTone = 'neutral' | 'pending' | 'blue' | 'danger';

export interface AchievementChip {
  readonly label: string;
  readonly tone: ChipTone;
  readonly icon: 'shield' | 'clock' | 'check' | 'x';
  readonly accessibilityLabel: string;
}

const CHIPS: Readonly<Record<VerificationStatusValue, AchievementChip>> = {
  UNVERIFIED: {
    label: 'Unverified',
    tone: 'neutral',
    icon: 'shield',
    accessibilityLabel: 'Unverified achievement',
  },
  PENDING: {
    label: 'Pending',
    tone: 'pending',
    icon: 'clock',
    accessibilityLabel: 'Certification pending',
  },
  VERIFIED: {
    label: 'Verified',
    tone: 'blue',
    icon: 'check',
    accessibilityLabel: 'Verified achievement',
  },
  REJECTED: {
    label: 'Rejected',
    tone: 'danger',
    icon: 'x',
    accessibilityLabel: 'Certification rejected',
  },
};

export function achievementChip(status: VerificationStatusValue): AchievementChip {
  return CHIPS[status];
}

// Certification can be requested only for these statuses (ADR-016).
export function canRequestCertification(status: VerificationStatusValue): boolean {
  return status === 'UNVERIFIED' || status === 'REJECTED';
}
