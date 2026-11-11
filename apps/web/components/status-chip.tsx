import type { ReactNode } from 'react';

// Status chips from the prototype (portal-shell.jsx STATUS, atoms.jsx Chip).
// "Suspended" is "Deactivated" here (handoff exception).

export type ChipTone = 'verified' | 'pending' | 'rejected' | 'blue' | 'neutral';

const TONES: Record<ChipTone, string> = {
  verified: 'bg-verified-tint text-verified border-verified/20',
  pending: 'bg-pending-tint text-pending border-pending/20',
  rejected: 'bg-rejected-tint text-rejected border-rejected/20',
  blue: 'bg-blue-tint text-blue border-blue-line',
  neutral: 'bg-tag text-text border-line',
};

export function Chip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-pill border px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.6px] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export const STATUS = {
  active: { tone: 'verified', label: 'Active' },
  deactivated: { tone: 'rejected', label: 'Deactivated' },
  pending: { tone: 'pending', label: 'Pending' },
  expired: { tone: 'neutral', label: 'Expired' },
  accepted: { tone: 'verified', label: 'Accepted' },
  declined: { tone: 'neutral', label: 'Declined' },
  revoked: { tone: 'rejected', label: 'Revoked' },
  revokedTrainer: { tone: 'rejected', label: 'Revoked trainer' },
  member: { tone: 'verified', label: 'Member' },
  waitingAthlete: { tone: 'pending', label: 'Waiting for the athlete' },
} as const satisfies Record<string, { tone: ChipTone; label: string }>;

export type StatusKey = keyof typeof STATUS;

export function StatusChip({ status }: { status: StatusKey }) {
  const { tone, label } = STATUS[status];
  return <Chip tone={tone}>{label}</Chip>;
}
