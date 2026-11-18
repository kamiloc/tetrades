import type { MessageKey } from '../translations';

// What a trainer page shows when an API call fails (design D6). FORBIDDEN on
// a write is ambiguous: the caller re-reads their clubs first and passes
// `stillTrainer`. A `not-trainer` notice means the page should call
// router.refresh(), so the club layout guard shows NotTrainerOfClub.

export type TrainerAction =
  | 'load' // any club-scoped query
  | 'load-athlete' // club.getRosterAthlete
  | 'invite' // club.inviteAthlete
  | 'report-entry' // metric.reportEntry
  | 'decide-certification'; // achievement.decideCertification

export type TrainerNotice =
  | { kind: 'not-trainer' }
  | { kind: 'athlete-not-found' }
  | { kind: 'no-longer-member' }
  | { kind: 'no-longer-pending' }
  | { kind: 'already-member' }
  | { kind: 'clock-skew' }
  | { kind: 'failed' };

export function trainerErrorNotice(
  code: string | null,
  stillTrainer: boolean | null,
  action: TrainerAction,
): TrainerNotice {
  if (stillTrainer === false) return { kind: 'not-trainer' };
  switch (action) {
    case 'load':
      return code === 'FORBIDDEN' || code === 'NOT_FOUND' ? { kind: 'not-trainer' } : { kind: 'failed' };
    case 'load-athlete':
      if (code === 'NOT_FOUND' || code === 'BAD_REQUEST') return { kind: 'athlete-not-found' };
      return code === 'FORBIDDEN' ? { kind: 'not-trainer' } : { kind: 'failed' };
    case 'invite':
      if (code === 'CONFLICT') return { kind: 'already-member' };
      if (code === 'NOT_FOUND') return { kind: 'athlete-not-found' };
      return code === 'FORBIDDEN' ? { kind: 'not-trainer' } : { kind: 'failed' };
    case 'report-entry':
      if (code === 'FORBIDDEN') return { kind: 'no-longer-member' };
      return code === 'BAD_REQUEST' ? { kind: 'clock-skew' } : { kind: 'failed' };
    case 'decide-certification':
      if (code === 'FORBIDDEN') return { kind: 'no-longer-member' };
      return code === 'BAD_REQUEST' || code === 'NOT_FOUND'
        ? { kind: 'no-longer-pending' }
        : { kind: 'failed' };
  }
}

/** Whether a write's FORBIDDEN needs the caller's clubs re-read first. */
export function needsTrainerCheck(code: string | null, action: TrainerAction): boolean {
  return code === 'FORBIDDEN' && (action === 'report-entry' || action === 'decide-certification');
}

/** Message keys; translate with the page's `t`. */
export const TRAINER_NOTICE_COPY: Record<TrainerNotice['kind'], MessageKey> = {
  'not-trainer': 'trainer.notice.notTrainer',
  'athlete-not-found': 'trainer.notice.athleteNotFound',
  'no-longer-member': 'trainer.notice.noLongerMember',
  'no-longer-pending': 'trainer.notice.noLongerPending',
  'already-member': 'trainer.notice.alreadyMember',
  'clock-skew': 'trainer.notice.clockSkew',
  failed: 'common.genericError',
};
