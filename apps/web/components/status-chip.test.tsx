// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { STATUS, StatusChip, type StatusKey } from './status-chip';

afterEach(cleanup);

const EXPECTED: Record<StatusKey, string> = {
  active: 'Active',
  deactivated: 'Deactivated',
  pending: 'Pending',
  expired: 'Expired',
  accepted: 'Accepted',
  declined: 'Declined',
  revoked: 'Revoked',
  revokedTrainer: 'Revoked trainer',
  clubDeactivated: 'Club deactivated',
  member: 'Member',
  waitingAthlete: 'Waiting for the athlete',
};

describe('StatusChip', () => {
  it('covers exactly the portal states', () => {
    expect(Object.keys(STATUS).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(Object.entries(EXPECTED) as [StatusKey, string][])(
    'renders %s as "%s"',
    (status, label) => {
      render(<StatusChip status={status} />);
      expect(screen.getByText(label)).toBeTruthy();
    },
  );
});
