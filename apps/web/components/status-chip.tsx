'use client';

import type { ReactNode } from 'react';

import { useWebLocalization } from '../lib/i18n';
import type { MessageKey } from '../lib/translations';

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
  active: { tone: 'verified', label: 'status.active' },
  deactivated: { tone: 'rejected', label: 'status.deactivated' },
  pending: { tone: 'pending', label: 'status.pending' },
  expired: { tone: 'neutral', label: 'status.expired' },
  accepted: { tone: 'verified', label: 'status.accepted' },
  declined: { tone: 'neutral', label: 'status.declined' },
  revoked: { tone: 'rejected', label: 'status.revoked' },
  revokedTrainer: { tone: 'rejected', label: 'status.revokedTrainer' },
  member: { tone: 'verified', label: 'status.member' },
  waitingAthlete: { tone: 'pending', label: 'status.waitingAthlete' },
} as const satisfies Record<string, { tone: ChipTone; label: MessageKey }>;

export type StatusKey = keyof typeof STATUS;

export function StatusChip({ status }: { status: StatusKey }) {
  const { t } = useWebLocalization();
  const { tone, label } = STATUS[status];
  return <Chip tone={tone}>{t(label)}</Chip>;
}
