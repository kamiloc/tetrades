import { describe, expect, it } from 'vitest';

import { noticeForError } from './invitations-list';

describe('noticeForError', () => {
  it('shows the separate-account message only for FORBIDDEN', () => {
    expect(noticeForError('FORBIDDEN')).toEqual({
      notice: { kind: 'separate-account' },
      refetch: false,
    });
  });

  it.each(['NOT_FOUND', 'BAD_REQUEST'])(
    'treats %s as no longer available and refetches',
    (code) => {
      expect(noticeForError(code)).toEqual({ notice: { kind: 'unavailable' }, refetch: true });
    },
  );

  it.each([null, 'INTERNAL_SERVER_ERROR', 'UNAUTHORIZED'])(
    'falls back to a generic failure for %s',
    (code) => {
      expect(noticeForError(code)).toEqual({ notice: { kind: 'failed' }, refetch: false });
    },
  );
});
