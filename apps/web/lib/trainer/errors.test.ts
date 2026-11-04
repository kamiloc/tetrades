import { describe, expect, it } from 'vitest';

import { needsTrainerCheck, TRAINER_NOTICE_COPY, trainerErrorNotice, type TrainerAction } from './errors';

const ACTIONS: TrainerAction[] = ['load', 'load-athlete', 'invite', 'report-entry', 'decide-certification'];

describe('trainerErrorNotice', () => {
  it.each(ACTIONS)('%s: a lost trainer role always means not-trainer', (action) => {
    expect(trainerErrorNotice('FORBIDDEN', false, action)).toEqual({ kind: 'not-trainer' });
    expect(trainerErrorNotice(null, false, action)).toEqual({ kind: 'not-trainer' });
  });

  it('load: FORBIDDEN or NOT_FOUND for the club refreshes into the guard', () => {
    expect(trainerErrorNotice('FORBIDDEN', null, 'load')).toEqual({ kind: 'not-trainer' });
    expect(trainerErrorNotice('NOT_FOUND', null, 'load')).toEqual({ kind: 'not-trainer' });
    expect(trainerErrorNotice('INTERNAL_SERVER_ERROR', null, 'load')).toEqual({ kind: 'failed' });
  });

  it('load-athlete: NOT_FOUND and a malformed id are athlete not found', () => {
    expect(trainerErrorNotice('NOT_FOUND', null, 'load-athlete')).toEqual({ kind: 'athlete-not-found' });
    expect(trainerErrorNotice('BAD_REQUEST', null, 'load-athlete')).toEqual({ kind: 'athlete-not-found' });
    expect(trainerErrorNotice('FORBIDDEN', null, 'load-athlete')).toEqual({ kind: 'not-trainer' });
    expect(trainerErrorNotice(null, null, 'load-athlete')).toEqual({ kind: 'failed' });
  });

  it('invite: CONFLICT, NOT_FOUND, FORBIDDEN and others', () => {
    expect(trainerErrorNotice('CONFLICT', null, 'invite')).toEqual({ kind: 'already-member' });
    expect(trainerErrorNotice('NOT_FOUND', null, 'invite')).toEqual({ kind: 'athlete-not-found' });
    expect(trainerErrorNotice('FORBIDDEN', null, 'invite')).toEqual({ kind: 'not-trainer' });
    expect(trainerErrorNotice('TOO_MANY_REQUESTS', null, 'invite')).toEqual({ kind: 'failed' });
  });

  it('report-entry: FORBIDDEN while still a trainer is the membership; BAD_REQUEST is clock skew', () => {
    expect(trainerErrorNotice('FORBIDDEN', true, 'report-entry')).toEqual({ kind: 'no-longer-member' });
    expect(trainerErrorNotice('BAD_REQUEST', true, 'report-entry')).toEqual({ kind: 'clock-skew' });
    expect(trainerErrorNotice('NOT_FOUND', true, 'report-entry')).toEqual({ kind: 'failed' });
  });

  it('decide-certification: FORBIDDEN while still a trainer; BAD_REQUEST or NOT_FOUND no longer pending', () => {
    expect(trainerErrorNotice('FORBIDDEN', true, 'decide-certification')).toEqual({ kind: 'no-longer-member' });
    expect(trainerErrorNotice('BAD_REQUEST', true, 'decide-certification')).toEqual({ kind: 'no-longer-pending' });
    expect(trainerErrorNotice('NOT_FOUND', true, 'decide-certification')).toEqual({ kind: 'no-longer-pending' });
    expect(trainerErrorNotice(null, true, 'decide-certification')).toEqual({ kind: 'failed' });
  });

  it('asks for a trainer check only on a FORBIDDEN write', () => {
    expect(needsTrainerCheck('FORBIDDEN', 'report-entry')).toBe(true);
    expect(needsTrainerCheck('FORBIDDEN', 'decide-certification')).toBe(true);
    expect(needsTrainerCheck('FORBIDDEN', 'invite')).toBe(false);
    expect(needsTrainerCheck('BAD_REQUEST', 'report-entry')).toBe(false);
  });

  it('has user-facing copy for every notice, with no codes or ids', () => {
    for (const copy of Object.values(TRAINER_NOTICE_COPY)) {
      expect(copy).not.toMatch(/FORBIDDEN|NOT_FOUND|BAD_REQUEST|CONFLICT|[a-z0-9]{25}/);
    }
  });
});
